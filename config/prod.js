import dotenv from 'dotenv'
dotenv.config()

export default {
    dbURL: process.env.MONGO_URL,
    dbName: process.env.DB_NAME
}
// export default {
//     dbURL: process.env.MONGO_URL || 'mongodb+srv://reutedry1:reutedry1@cluster0.7r1ws.mongodb.net/',
//     dbName: process.env.DB_NAME || 'codeBlock_db'
// }
