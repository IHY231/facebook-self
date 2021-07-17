import MessengerClient from "./Client";
import MessengerThread from "./Thread";

export default class MessengerUser {
    id: string = "";
    thread!: MessengerThread;
    client: MessengerClient;

    constructor(client: MessengerClient) {
        this.client = client;
    }
}
