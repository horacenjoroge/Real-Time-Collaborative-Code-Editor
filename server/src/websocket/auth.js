"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateSocket = authenticateSocket;
exports.generateToken = generateToken;
var jsonwebtoken_1 = require("jsonwebtoken");
var JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
/**
 * Authenticate socket connection using JWT token
 * For now, we'll allow anonymous connections but validate tokens if provided
 */
function authenticateSocket(socket, token) {
    if (!token) {
        // Allow anonymous connections for now
        // In production, you might want to require authentication
        var anonymousId = "anon-".concat(socket.id);
        socket.userId = anonymousId;
        socket.username = 'Anonymous';
        return {
            authenticated: true,
            userId: anonymousId,
            username: 'Anonymous',
        };
    }
    try {
        var decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        return {
            authenticated: true,
            userId: decoded.userId,
            username: decoded.username,
        };
    }
    catch (error) {
        console.error('JWT verification failed:', error);
        return { authenticated: false };
    }
}
/**
 * Generate JWT token for testing/development
 */
function generateToken(userId, username) {
    var payload = { userId: userId, username: username };
    var options = {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, options);
}
