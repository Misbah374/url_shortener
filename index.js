const http = require("http");
const fs = require("fs");
const { randomBytes } = require("crypto");
const path = require("path");
const { URL } = require("url");

const allData = null;

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
const generateCode = (urlMap) => {
    const cryptoCode = require("crypto");
    let code;
    do{
        code = cryptoCode.randomBytes(3).toString("hex");      // 6-char hex code
    }while(urlMap.hasOwnProperty(code));
    return code;     
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
        const customCode = parsedUrl.searchParams.get("code");
        let newCustomCode;
        if (customCode) {
            // Already exists -> return old short url
            if(urlMap.hasOwnProperty(customCode)){
                res.writeHead(400, {"content-type": "application/json"});
                res.end(JSON.stringify({ error: "Already passed!" }));
                return;
            }
            newCustomCode = customCode.trim();
        }else{
            newCustomCode = generateCode(urlMap);
        }
        const existingCode = Object.keys(urlMap).find(key => urlMap[key] === longUrl);
        if(existingCode){
            res.writeHead(200, {"content-type": "application/json"});
            res.end(JSON.stringify({shortUrl: `http://${req.headers.host}/${existingCode}`}));
            return;
        }
        urlMap[newCustomCode] = longUrl;
        saveDB(urlMap);

        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify({shortUrl: `http://${req.headers.host}/${newCustomCode}`}));
        return;
    }

    // Redirect from short url
    const code = parsedUrl.pathname.slice(1);
    if(code && urlMap[code]){
        res.writeHead(302, {location:urlMap[code]});
        res.end();
        return;
    }

    // return all entries
    if(parsedUrl.pathname === "/all"){
        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify(urlMap, null, 2));
        return;
    }

    // delete an entry
    if(req.method === "DELETE" && parsedUrl.pathname === "/delete" && parsedUrl.searchParams.has("code")){
        const codeToDelete = parsedUrl.searchParams.get("code").trim();
        if(!urlMap[codeToDelete]){
            res.writeHead(404, {"content-type": "application/json"});
            res.end(JSON.stringify({error: "Code not found"}));
            return;
        }
        delete urlMap[codeToDelete];
        saveDB(urlMap);
        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify({message: `Deleted successfully ${codeToDelete}`}));
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
Step 1: Start

Step 2: Read the long URL input from the user.
        → O(1)

Step 3: Check if user provided a custom short code.
        (a) If custom code is provided:
            - Check if the code already exists in the database (JSON object).
              - O(1)
            - If it exists → return error "Code already exists".
            - Else → use this custom code.
        (b) If no custom code is provided:
            - Generate a random 6-character code using crypto.randomBytes(3).
              - O(1)

Step 4: Store the key–value pair (shortCode : longURL) in the JSON file.
        - Since JSON file is re-written every time, saving causes file I/O.
        → O(N), where N = total number of stored URLs

Step 5: When user visits a short URL:
        - Lookup shortCode in JSON object.
        - If found → redirect to original long URL.
        - Else → return 404 error.
        - O(1)

Step 6: For deleting a short URL:
        - Find shortCode in JSON object (O(1))
        - Delete that key and rewrite updated JSON file (O(N))
        - Overall O(N)

Step 7: End

Average Time Complexities:
Code generation / lookup / validation → O(1)
File read-write operations             → O(N)

Overall Complexity ≈ O(N)
*/

// http://localhost:3000/shortened?url=https://www.google.com
// http://localhost:3000/c327bc
