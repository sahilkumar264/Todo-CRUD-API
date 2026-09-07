import { openDatabase } from "./database.js";
const db = openDatabase();
console.log(JSON.stringify({ books: db.prepare("SELECT COUNT(*) AS count FROM books").get().count }, null, 2));
db.close();
