import MessengerAttachment from "./Attachment";
import MessengerClient from "./Client";
import MessengerThread from "./Thread";
import MessengerUser from "./User";

export default class MessengerMessage {
    id: string = "";
    content: string = "";
    attachments: MessengerAttachment[] = [];
    client: MessengerClient;
    author!: MessengerUser;
    thread!: MessengerThread;

    constructor(client: MessengerClient) {
        this.client = client;
    }
}
