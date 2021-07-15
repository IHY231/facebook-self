let fetch = require("node-fetch");
let cheerio = require("cheerio");

(async () => {
    for (let i = 1349001; i <= 1349010; i++) {
        let a = await fetch(`https://mbasic.facebook.com/login/?email=adfk&li=VxruYEgK4t0LOMlzIgLak6oj&e=${i}&shbl=1&refsrc=deprecated&_rdr`);
        let $ = cheerio.load(await a.text());

        console.log(i, $("#login_error *").html().replace(/\n|\r|(\r\n)/g, "\\n"));
    }
})();
