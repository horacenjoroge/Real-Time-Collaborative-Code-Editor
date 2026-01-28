"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.documentService = exports.DocumentService = void 0;
var connection_1 = require("../database/connection");
var DocumentService = /** @class */ (function () {
    function DocumentService() {
    }
    /**
     * Create a new document
     */
    DocumentService.prototype.createDocument = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var title, _a, language, _b, content, created_by, result, document;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        title = input.title, _a = input.language, language = _a === void 0 ? 'plaintext' : _a, _b = input.content, content = _b === void 0 ? '' : _b, created_by = input.created_by;
                        return [4 /*yield*/, connection_1.pool.query("INSERT INTO documents (title, language, content, created_by)\n       VALUES ($1, $2, $3, $4)\n       RETURNING *", [title, language, content, created_by])];
                    case 1:
                        result = _c.sent();
                        document = result.rows[0];
                        // Add creator as owner
                        return [4 /*yield*/, this.addDocumentPermission({
                                document_id: document.id,
                                user_id: created_by,
                                role: 'owner',
                            })];
                    case 2:
                        // Add creator as owner
                        _c.sent();
                        return [2 /*return*/, __assign(__assign({}, document), { role: 'owner' })];
                }
            });
        });
    };
    /**
     * Get document by ID with permission check
     */
    DocumentService.prototype.getDocumentById = function (documentId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result, doc;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.pool.query("SELECT d.*, du.role\n       FROM documents d\n       LEFT JOIN document_users du ON d.id = du.document_id AND du.user_id = $2\n       WHERE d.id = $1 AND d.deleted_at IS NULL\n       LIMIT 1", [documentId, userId])];
                    case 1:
                        result = _a.sent();
                        if (result.rows.length === 0) {
                            return [2 /*return*/, null];
                        }
                        doc = result.rows[0];
                        // If user is creator but not in document_users, they're owner
                        if (!doc.role && doc.created_by === userId) {
                            doc.role = 'owner';
                        }
                        return [2 /*return*/, doc];
                }
            });
        });
    };
    /**
     * Update document content
     */
    DocumentService.prototype.updateDocument = function (documentId, userId, input) {
        return __awaiter(this, void 0, void 0, function () {
            var doc, updates, values, paramIndex, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDocumentById(documentId, userId)];
                    case 1:
                        doc = _a.sent();
                        if (!doc || (doc.role !== 'owner' && doc.role !== 'editor')) {
                            throw new Error('Permission denied');
                        }
                        updates = [];
                        values = [];
                        paramIndex = 1;
                        if (input.title !== undefined) {
                            updates.push("title = $".concat(paramIndex++));
                            values.push(input.title);
                        }
                        if (input.language !== undefined) {
                            updates.push("language = $".concat(paramIndex++));
                            values.push(input.language);
                        }
                        if (input.content !== undefined) {
                            updates.push("content = $".concat(paramIndex++));
                            values.push(input.content);
                        }
                        if (updates.length === 0) {
                            return [2 /*return*/, doc];
                        }
                        values.push(documentId);
                        return [4 /*yield*/, connection_1.pool.query("UPDATE documents\n       SET ".concat(updates.join(', '), "\n       WHERE id = $").concat(paramIndex, " AND deleted_at IS NULL\n       RETURNING *"), values)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.rows[0] || null];
                }
            });
        });
    };
    /**
     * Soft delete document
     */
    DocumentService.prototype.deleteDocument = function (documentId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var doc, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDocumentById(documentId, userId)];
                    case 1:
                        doc = _a.sent();
                        if (!doc || doc.role !== 'owner') {
                            throw new Error('Permission denied: Only owner can delete document');
                        }
                        return [4 /*yield*/, connection_1.pool.query("UPDATE documents\n       SET deleted_at = CURRENT_TIMESTAMP\n       WHERE id = $1 AND deleted_at IS NULL", [documentId])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount > 0];
                }
            });
        });
    };
    /**
     * List user's documents
     */
    DocumentService.prototype.listUserDocuments = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.pool.query("SELECT d.*, COALESCE(du.role, \n         CASE WHEN d.created_by = $1 THEN 'owner'::VARCHAR ELSE NULL END\n       ) as role\n       FROM documents d\n       LEFT JOIN document_users du ON d.id = du.document_id AND du.user_id = $1\n       WHERE (d.created_by = $1 OR du.user_id = $1)\n         AND d.deleted_at IS NULL\n       ORDER BY d.updated_at DESC", [userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    /**
     * Add document permission
     */
    DocumentService.prototype.addDocumentPermission = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.pool.query("INSERT INTO document_users (document_id, user_id, role)\n       VALUES ($1, $2, $3)\n       ON CONFLICT (document_id, user_id)\n       DO UPDATE SET role = EXCLUDED.role", [input.document_id, input.user_id, input.role])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Remove document permission
     */
    DocumentService.prototype.removeDocumentPermission = function (documentId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.pool.query("DELETE FROM document_users\n       WHERE document_id = $1 AND user_id = $2", [documentId, userId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rowCount > 0];
                }
            });
        });
    };
    /**
     * Update user's last seen timestamp
     */
    DocumentService.prototype.updateLastSeen = function (documentId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.pool.query("UPDATE document_users\n       SET last_seen = CURRENT_TIMESTAMP\n       WHERE document_id = $1 AND user_id = $2", [documentId, userId])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get document users/permissions
     */
    DocumentService.prototype.getDocumentUsers = function (documentId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, connection_1.pool.query("SELECT user_id, role, last_seen\n       FROM document_users\n       WHERE document_id = $1\n       ORDER BY role, last_seen DESC", [documentId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows];
                }
            });
        });
    };
    return DocumentService;
}());
exports.DocumentService = DocumentService;
exports.documentService = new DocumentService();
