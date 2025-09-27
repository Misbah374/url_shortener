const http = require("http");
const fs = require("fs");
const { randomBytes } = require("crypto");
const path = require("path");
const { URL } = require("url");

const PORT = 3000;
const DB_FILE = "urls.json";

// load DB from disk or json file
const loadDB = () => {
    if(!fs.existsSync(DB_FILE)) return {};
    const data = fs.readFileSync(DB_FILE, "utf8").trim();
    if(!data) return {};
    return JSON.parse(data);
}

// Save DB to json file
const saveDB = (db) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    // JSON.stringify(value, replacer, space)
}

// Generate a short random code
const generateCode = () => {
    return randomBytes(3).toString("hex");      // 6-char hex code
    // randomBytes(3): This is a function from Node.js's built-in crypto module. It generates a Buffer (a data structure for handling binary data) containing 3 cryptographically random bytes. A single byte can store 256 different values.
    // .toString("hex"): This method converts the Buffer of random bytes into a hexadecimal string. Since each byte can be represented by two hexadecimal characters (e.g., 00 to ff), 3 bytes are converted into a 6-character string. For example, if the 3 random bytes were [104, 255, 3], the resulting hexadecimal string would be 68ff03
}

const server = http.createServer((req,res)=>{
    const urlMap = loadDB();
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    // Serve frontend
    if (req.method === "GET" && (parsedUrl.pathname === "/" || parsedUrl.pathname.endsWith(".html"))) {
        const filePath = parsedUrl.pathname === "/"
                ? path.join(__dirname, "index.html") // your HTML is in root, not public folder
                : path.join(__dirname, parsedUrl.pathname.slice(1));
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end("Not found");
                return;
            } else {
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(data);
            }
        });
        return;
    }

    // shorten a url
    if(parsedUrl.pathname === "/shortened" && parsedUrl.searchParams.has("url")){
        const longUrl = parsedUrl.searchParams.get("url");
        const code = generateCode();
        urlMap[code] = longUrl;
        saveDB(urlMap);

        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify({shortUrl: `http://${req.headers.host}/${code}`}));
        return;
    }

    // Redirect from short url
    const code = parsedUrl.pathname.slice(1);
    if(code && urlMap[code]){
        res.writeHead(302, {location:urlMap[code]});
        res.end();
        return;
    }

    // fallback
    res.writeHead(404, {"content-type":"text/plain"});
    res.end("404 Not Found");
});

server.listen(PORT, () => {
    console.log(`ser running at http://localhost:${PORT}`);
});




/*
---------- Algorithm ----------
Is this correct algorithm: 
step1: start
step2: Read the url input
step3: generate a random string of six letters 
       https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator
       O(N) + O(N) = O(2N)
       for N = 3
       O(3) + O(3) = O(6) => O(1)
step4: Store generated url and original url in a json file as key:value pair 
       O(N) because using json file as it will delete everything and re-write again
step5: Whenever shortened url is called, redirect to value of that key from json file 
       O(N)
step6: end

Time complexity is O(N)
*/

// http://localhost:3000/shortened?url=https://www.google.com
// http://localhost:3000/c327bc
