const fs = require('fs')
const Path = require('path')

const folder = process.argv.slice(2)[0]

if (folder) {
    try {
        fs.rmSync(Path.join(__dirname, '../dist', folder), { recursive: true });
    } catch { }
} else {
    try {
        fs.rmSync(Path.join(__dirname, '../dist/cjs'), { recursive: true });
    } catch { }
    try {
        fs.rmSync(Path.join(__dirname, '../dist/esm'), { recursive: true });
    } catch { }
    try {
        fs.rmSync(Path.join(__dirname, '../dist/types'), { recursive: true });
    } catch { }
}