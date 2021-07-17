import MessengerMQTTConnection from "./MQTTConnection";
import { EventEmitter } from "events";
import MessengerMessage from "./Message";
import MessengerClient from "./Client";
import MessengerUser from "./User";
import MessengerThread from "./Thread";

export default interface MessengerMessageParser {
    on(event: "message", listener: (message: MessengerMessage) => void): this;

    emit(event: "message", message: MessengerMessage): boolean;
}

export default class MessengerMessageParser extends EventEmitter {
    #mqtt: MessengerMQTTConnection;
    #client: MessengerClient;

    /** Construct a message parser */
    constructor(client: MessengerClient, mqtt: MessengerMQTTConnection) {
        super();
        if (mqtt instanceof MessengerMQTTConnection) {
            this.#mqtt = mqtt;
        } else {
            throw new Error("MessengerMQTTConnection should be passed as an argument to parse.");
        }

        if (client instanceof MessengerClient) {
            this.#client = client;
        } else {
            throw new Error("Client should be passed as an argument to parse.");
        }

        this.#mqtt.on("message", (topic, payload, _packet) => {
            switch (topic) {
                case "/t_ms":
                    this.#parseMessage(JSON.parse(payload.toString("utf8"))); break;

            }
        });
    }

    async #parseMessage(messageData: {
        deltas: any[],
        firstDeltaSeqId: number,
        lastIssuedSeqId: number,
        queueEntityId: number
    }) {
        for (let delta of messageData.deltas) {
            if (delta.class === "NewMessage") {
                this.#parseNormalMessage(delta);
            }
        }
    }

    #parseNormalMessage(delta: any) {
        let thisAccountID = this.#client.account?.accountID ?? "";
        let m = new MessengerMessage(this.#client);

        m.id = delta.messageMetadata.messageId;
        m.content = delta.body ?? "";

        let authorID = delta.messageMetadata.actorFbId;
        m.author = this.#client.users.get(authorID);
        let authorThread = this.#client.threads.get(authorID);
        if (authorThread.group === null) {
            authorThread.group = false;
            authorThread.participants.set(authorID, this.#client.users.get(authorID));
            authorThread.participants.set(thisAccountID, this.#client.users.get(thisAccountID));
        }

        let isGroup = !!delta.messageMetadata.threadKey.threadFbId;
        let threadID = delta.messageMetadata.threadKey.threadFbId ?? delta.messageMetadata.threadKey.otherUserFbId;
        let cacheThread = this.#client.threads.get(threadID);
        cacheThread.group = isGroup;
        if (isGroup) {
            cacheThread.participants.clear();
            for (let p of delta.participants) {
                cacheThread.participants.set(p, this.#client.users.get(p));
            }
        }
        m.thread = cacheThread;

        this.#client.messages.cache.set(m.id, m);
        this.emit("message", m);
    }
}
