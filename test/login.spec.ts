import "mocha";
import { step } from "mocha-steps";
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Account, BasicALoginHandler } from "../src";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Login", function () {
    describe("Basic", function () {
        // FB WhiteHat account ID 100070617284604
        let account = new Account("hckdqxh_bushakescu_1626222098@tfbnw.net", "mww3swya95f");

        step("should login", async function () {    
            await expect(account.login(new BasicALoginHandler())).to.be.fulfilled;
            expect(account.loggedIn).to.be.true;
        });

        step("should correctly verify that we're logged in", async function () {
            await expect(account.verify(new BasicALoginHandler())).to.eventually.be.true;
            expect(account.loggedIn).to.be.true;
        });

        step("should correctly import/export state", async function () {
            let exported = await account.getStateBuf();
            assert(exported instanceof Buffer, "Exported data is not Buffer");
            
            let aclone = new Account(exported);
            await expect(aclone.verify(new BasicALoginHandler())).to.eventually.be.true;
            expect(aclone.loggedIn).to.be.true;
        });

        step("should logout", async function () {
            await expect(account.logout()).to.be.fulfilled;
            expect(account.loggedIn).to.be.false;
        });

        step("should correctly verify that we're not logged in", async function () {
            await expect(account.verify(new BasicALoginHandler())).to.eventually.be.false;
            expect(account.loggedIn).to.be.false;
        });
    });
});
