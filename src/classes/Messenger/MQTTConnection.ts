import FacebookAccount from "../Facebook/Account";
import MQTT from "mqtt";
import { EventEmitter } from "events";
import qs from "querystring";
import generateGUID from "../../functions/generate_guid";

const defSubscribe = [
    "/t_ms",
    "/thread_typing",
    "/orca_typing_notifications",
    "/notify_disconnect",
    "/br_sr",
    "/sr_res",
    "/legacy_web_mtouch"
];

export default interface MessengerMQTTConnection {
    on(event: "message", listener: (topic: string, payload: Buffer, packet: MQTT.IPublishPacket) => void): this;
    on(event: "publish", listener: (topic: string, message: string | Buffer, opts: MQTT.IClientPublishOptions, callback?: MQTT.PacketCallback | undefined) => void): this;

    emit(event: "message", topic: string, payload: Buffer, packet: MQTT.IPublishPacket): boolean;
    emit(event: "publish", topic: string, message: string | Buffer, opts: MQTT.IClientPublishOptions, callback?: MQTT.PacketCallback | undefined): boolean;
}

export default class MessengerMQTTConnection extends EventEmitter {
    #subscribedTopic: string[] = [];
    #publishQueue: [string, string | Buffer, MQTT.IClientPublishOptions, MQTT.PacketCallback | undefined][] = [];
    #established = false;
    #connected = false;
    #lastSeqID: number = 0;
    #syncToken: string = "1";
    #mqtt: MQTT.MqttClient | null = null;

    #account: FacebookAccount;
    get account() {
        return this.#account;
    }

    /** Construct a MQTT connection handler for Facebook Messenger. */
    constructor(account: FacebookAccount) {
        super();
        this.#account = account;

        this.on("publish", (topic: string, message: string | Buffer, opts: MQTT.IClientPublishOptions, callback?: MQTT.PacketCallback | undefined) => {
            if (this.#established && !this.#publishQueue.length) {
                this.#mqtt?.publish(topic, message, opts, callback);
            } else {
                this.#publishQueue.push([topic, message, opts, callback]);
            }
        });
    }

    async connect() {
        if (!this.#connected) {
            let iHTML = await (await this.#account.context.context.fetch("https://m.facebook.com/")).text();
            let regexFilter0 = /\["MqttWebConfig",\[\],(.+?),3790]/;
            let json0 = JSON.parse(iHTML.match(regexFilter0)?.[1] ?? "{}");
            let regexFilter1 = /\["MqttWebDeviceID",\[\],(.+?),5003]/;
            let json1 = JSON.parse(iHTML.match(regexFilter1)?.[1] ?? "{}");
            // ["MMessengerMQTTConnection","setUp",[],[{fbid:"1000---REDACTED",irisSeqID:"6------",appID:219994525426954,endpoint:"wss://edge-chat.facebook.com/chat?region=atn"}]]
            let regexFilter2 = new RegExp(`\\["MMessengerMQTTConnection\\",\\"setUp\\",\\[\\],\\[(.+?endpoint:"${json0.endpoint}"})\\]\\]`);
            let json2 = JSON.parse(iHTML.match(regexFilter2)?.[1] ?? "{}");

            let sessionID = Math.floor(Math.random() * 9007199254740991) + 1;
            let constructUsername = (sessionID: number, pm: any[]) => {
                return {
                    u: this.#account.accountID,
                    s: sessionID,
                    cp: json0.clientCapabilities,
                    ecp: json0.capabilities,
                    chat_on: true,
                    fg: false,
                    d: generateGUID(),
                    ct: 'websocket',
                    mqtt_sid: '',
                    aid: '219994525426954',
                    st: this.#subscribedTopic,
                    pm,
                    dc: '',
                    no_auto_fg: true,
                    gas: null,
                    pack: [],
                    php_override: ""
                }
            }

            Object.assign(this.#subscribedTopic, json0.subscribedTopics);

            this.#mqtt = MQTT.connect(json0.endpoint + "&" + qs.stringify({
                sid: sessionID,
                cid: json1.clientID
            }), {
                clientId: 'mqttwsclient',
                protocolId: 'MQIsdp',
                protocolVersion: 3,
                username: JSON.stringify(constructUsername(sessionID, [])),
                clean: true,
                wsOptions: {
                    headers: {
                        Origin: 'https://m.facebook.com',
                        'User-Agent': this.#account.context.userAgent,
                        Referer: 'https://m.facebook.com/',
                        Host: 'edge-chat.facebook.com'
                    },
                    origin: 'https://m.facebook.com',
                    protocolVersion: 13
                }
            });

            await new Promise(r => this.#mqtt?.once("connect", r));

            for (let topic of defSubscribe) {
                this.#mqtt.subscribe(topic);
                this.#subscribedTopic.push(topic);
            }

            let initObj = {
                sync_api_version: 10,
                max_deltas_able_to_process: 1000,
                delta_batch_size: 500,
                encoding: 'JSON',
                entity_fbid: this.#account.accountID
            };

            await Promise.all([
                new Promise(r => this.#mqtt?.publish("/messenger_sync_create_queue", JSON.stringify({
                    ...initObj,
                    initial_titan_sequence_id: json2.irisSeqID,
                    device_params: null
                }), { qos: 1, retain: false }, r)),
                new Promise(r => this.#mqtt?.publish("/set_client_settings", JSON.stringify({
                    make_user_available_when_in_foreground: true
                }), { qos: 1, retain: false }, r))
            ]);

            let handleQueue = async () => {
                for (let qTask of this.#publishQueue) {
                    try {
                        await new Promise<void>(r => this.#mqtt?.publish(qTask[0], qTask[1], qTask[2], (e, p) => {
                            r();
                            qTask[3]?.(e, p);
                        }));
                    } catch {
                        break;
                    }
                }
            }

            let eventResolver = (topic: string, payload: Buffer, packet: MQTT.IPublishPacket) => {
                if (topic === "/t_ms") {
                    let d = JSON.parse(payload.toString("utf8"));
                    if (d.firstDeltaSeqId) this.#lastSeqID = d.firstDeltaSeqId;
                    if (d.syncToken) this.#syncToken = d.syncToken;
                    if (d.lastIssuedSeqId) this.#lastSeqID = parseInt(d.lastIssuedSeqId);
                }

                this.emit("message", topic, payload, packet);
            }

            let reconnect = async () => {
                this.#established = false;
                if (this.#mqtt) {
                    this.#connected = false;
                    this.#mqtt.end(true);
                    this.#mqtt = null;
                }

                let sessionID = Math.floor(Math.random() * 9007199254740991) + 1;

                this.#mqtt = MQTT.connect(json0.endpoint + "&" + qs.stringify({
                    sid: sessionID,
                    cid: json1.clientID
                }), {
                    clientId: 'mqttwsclient',
                    protocolId: 'MQIsdp',
                    protocolVersion: 3,
                    username: JSON.stringify(constructUsername(sessionID, [{
                        topic: "/messenger_sync_get_diffs",
                        payload: JSON.stringify({
                            ...initObj,
                            sync_token: this.#syncToken,
                            last_seq_id: this.#lastSeqID
                        }),
                        qos: 1,
                        messageId: 65536
                    }])),
                    clean: true,
                    wsOptions: {
                        headers: {
                            Origin: 'https://m.facebook.com',
                            'User-Agent': this.#account.context.userAgent,
                            Referer: 'https://m.facebook.com/',
                            Host: 'edge-chat.facebook.com'
                        },
                        origin: 'https://m.facebook.com',
                        protocolVersion: 13
                    }
                });

                this.#mqtt.on("error", e => {
                    if (this.#connected) reconnect();
                });
                this.#mqtt.on("close", () => {
                    if (this.#connected) reconnect();
                });
                this.#mqtt.on("message", eventResolver);

                this.#connected = true;
                await new Promise(r => this.#mqtt?.once("connect", r));
                this.#established = true;
                await handleQueue();
            }
            
            this.#mqtt.on("error", e => {
                if (this.#connected) reconnect();
            });
            this.#mqtt.on("close", () => {
                if (this.#connected) reconnect();
            });
            this.#mqtt.on("message", eventResolver);


            this.#established = true;
            await handleQueue();
        }
    }

    disconnect() {
        this.#connected = false;
        this.#established = false;
        if (this.#mqtt) {
            this.#mqtt.end(true);
        }
    }
}
