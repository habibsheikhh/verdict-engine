"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
exports.prisma = global.workerPrisma ||
    new client_1.PrismaClient({
        log: ["error"],
    });
if (process.env.NODE_ENV !== "production") {
    global.workerPrisma = exports.prisma;
}
