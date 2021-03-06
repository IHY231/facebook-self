import "mocha";
import { step } from "mocha-steps";
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Facebook } from "../src";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Login", function () {
    describe("Basic", function () {
        // FB WhiteHat account ID 100070617284604
        let account = new Facebook.Account("hckdqxh_bushakescu_1626222098@tfbnw.net", "mww3swya95f");
        // FB WhiteHat account ID 100070836607635 (with 2FA enabled)
        let account2FA = new Facebook.Account("yjhgpfu_shepardstein_1626319082@tfbnw.net", "yqw9ohvrh5u", "5ZMJ 4G7N KF73 CXNO BX7L NOQY HIDM X6AF");

        step("should login", async function () {    
            await expect(account.login(new Facebook.BasicLoginHandler())).to.be.fulfilled;
            expect(account.loggedIn).to.be.true;
        });

        step("should correctly verify that we're logged in", async function () {
            await expect(account.verify(new Facebook.BasicLoginHandler())).to.eventually.be.true;
            expect(account.loggedIn).to.be.true;
        });

        step("should correctly import/export state", async function () {
            let exported = await account.getStateBuf();
            assert(exported instanceof Buffer, "Exported data is not Buffer");

            let aclone = new Facebook.Account(exported);
            await expect(aclone.verify(new Facebook.BasicLoginHandler())).to.eventually.be.true;
            expect(aclone.loggedIn).to.be.true;
        });

        step("should logout", async function () {
            await expect(account.logout()).to.be.fulfilled;
            expect(account.loggedIn).to.be.false;
        });

        step("should correctly verify that we're not logged in", async function () {
            await expect(account.verify(new Facebook.BasicLoginHandler())).to.eventually.be.false;
            expect(account.loggedIn).to.be.false;
        });

        step("should login with 2FA enabled", async function () {
            await expect(account2FA.login(new Facebook.BasicLoginHandler())).to.be.fulfilled;
            expect(account2FA.loggedIn).to.be.true;
            await expect(account2FA.logout()).to.be.fulfilled;
            expect(account.loggedIn).to.be.false;
        });
    });
});
