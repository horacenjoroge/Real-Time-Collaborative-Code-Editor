"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initializeDatabase = initializeDatabase;
exports.checkDatabaseHealth = checkDatabaseHealth;
var pg_1 = require("pg");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var poolConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'collab_editor',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
exports.pool = new pg_1.Pool(poolConfig);
// Test connection
exports.pool.on('connect', function () {
    console.log('✅ Database connected');
});
exports.pool.on('error', function (err) {
    console.error('❌ Database connection error:', err);
});
// Initialize database schema
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    // Create documents table
                    return [4 /*yield*/, exports.pool.query("\n      CREATE TABLE IF NOT EXISTS documents (\n        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n        title VARCHAR(255) NOT NULL,\n        language VARCHAR(50) NOT NULL DEFAULT 'plaintext',\n        content TEXT NOT NULL DEFAULT '',\n        created_by UUID NOT NULL,\n        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n        deleted_at TIMESTAMP NULL\n      );\n    ")];
                case 1:
                    // Create documents table
                    _a.sent();
                    // Create document_users table
                    return [4 /*yield*/, exports.pool.query("\n      CREATE TABLE IF NOT EXISTS document_users (\n        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,\n        user_id UUID NOT NULL,\n        role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),\n        last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n        PRIMARY KEY (document_id, user_id)\n      );\n    ")];
                case 2:
                    // Create document_users table
                    _a.sent();
                    // Create indexes
                    return [4 /*yield*/, exports.pool.query("\n      CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);\n      CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);\n      CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);\n      CREATE INDEX IF NOT EXISTS idx_document_users_user_id ON document_users(user_id);\n      CREATE INDEX IF NOT EXISTS idx_document_users_document_id ON document_users(document_id);\n    ")];
                case 3:
                    // Create indexes
                    _a.sent();
                    // Create function for updating updated_at
                    return [4 /*yield*/, exports.pool.query("\n      CREATE OR REPLACE FUNCTION update_updated_at_column()\n      RETURNS TRIGGER AS $$\n      BEGIN\n        NEW.updated_at = CURRENT_TIMESTAMP;\n        RETURN NEW;\n      END;\n      $$ language 'plpgsql';\n    ")];
                case 4:
                    // Create function for updating updated_at
                    _a.sent();
                    // Create trigger
                    return [4 /*yield*/, exports.pool.query("\n      DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;\n      CREATE TRIGGER update_documents_updated_at\n        BEFORE UPDATE ON documents\n        FOR EACH ROW\n        EXECUTE FUNCTION update_updated_at_column();\n    ")];
                case 5:
                    // Create trigger
                    _a.sent();
                    console.log('✅ Database schema initialized');
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error('❌ Failed to initialize database schema:', error_1);
                    throw error_1;
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Health check
function checkDatabaseHealth() {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, exports.pool.query('SELECT 1')];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
