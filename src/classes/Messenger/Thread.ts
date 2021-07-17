import MessengerClient from "./Client";
import MessengerMessage from "./Message";
import MessengerUser from "./User";

export default class MessengerThread {
    id: string = "0";
    client: MessengerClient;
    group: boolean | null = null;
    participants: Map<string, MessengerUser> = new Map();

    constructor(client: MessengerClient) {
        this.client = client;
    }

    async send(message: MessengerMessage | {
        content: string
    }) {
        
    }
}
