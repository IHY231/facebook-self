import { totp } from "speakeasy";

export default function generate2FA(secret: string) {
    let v = totp({
        secret: secret.replace(/ /g, "").toUpperCase(),
        encoding: "base32"
    });
    return v;
}