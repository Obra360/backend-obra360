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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var obras_js_1 = require("./routes/obras.js");
var path_1 = require("path");
var cors_1 = require("cors");
var client_1 = require("@prisma/client");
var url_1 = require("url");
var jsonwebtoken_1 = require("jsonwebtoken");
var sign = jsonwebtoken_1.default.sign;
var bcryptjs_1 = require("bcryptjs");
var auth_js_1 = require("./middlewares/auth.js");
var prisma = new client_1.PrismaClient();
var app = (0, express_1.default)();
var PORT = process.env.PORT || 3000;
if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET no definida");
    process.exit(1);
}
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/obras', obras_js_1.default);
// Necesario para que __dirname funcione con ES Modules
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
var frontendPath = path_1.default.join(__dirname, "../../frontend-obra360");
// Servir frontend estático
app.use(express_1.default.static(frontendPath));
app.get("/", function (req, res) { return res.sendFile(path_1.default.join(frontendPath, "index.html")); });
app.get("/*.html", function (req, res) {
    var requestedFile = path_1.default.join(frontendPath, req.path);
    res.sendFile(requestedFile, function (err) {
        if (err)
            res.status(404).send("Archivo no encontrado");
    });
});
// Registro de usuario
app.post("/users", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var hashedPassword, user, _, userWithoutPassword, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                return [4 /*yield*/, (0, bcryptjs_1.hash)(req.body.password, 10)];
            case 1:
                hashedPassword = _b.sent();
                return [4 /*yield*/, prisma.user.create({
                        data: __assign(__assign({}, req.body), { password: hashedPassword })
                    })];
            case 2:
                user = _b.sent();
                _ = user.password, userWithoutPassword = __rest(user, ["password"]);
                res.json(__assign(__assign({}, userWithoutPassword), { token: generateJwt(user) }));
                return [3 /*break*/, 4];
            case 3:
                _a = _b.sent();
                res.status(400).json({ error: "Email or username is not unique" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Login
app.post("/users/login", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, isPasswordCorrect, _, userWithoutPassword, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                return [4 /*yield*/, prisma.user.findUnique({
                        where: { email: req.body.email }
                    })];
            case 1:
                user = _b.sent();
                if (!user)
                    throw new Error("User not found");
                return [4 /*yield*/, (0, bcryptjs_1.compare)(req.body.password, user.password)];
            case 2:
                isPasswordCorrect = _b.sent();
                if (!isPasswordCorrect)
                    throw new Error("Incorrect password");
                _ = user.password, userWithoutPassword = __rest(user, ["password"]);
                res.json(__assign(__assign({}, userWithoutPassword), { token: generateJwt(user) }));
                return [3 /*break*/, 4];
            case 3:
                _a = _b.sent();
                res.status(401).json({ error: "Email or password are wrong" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Autenticación protegida
app.get("/user", auth_js_1.authenticate, function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _, userWithoutPassword;
    return __generator(this, function (_b) {
        try {
            if (!req.user)
                return [2 /*return*/, res.sendStatus(401)];
            _a = req.user, _ = _a.password, userWithoutPassword = __rest(_a, ["password"]);
            res.json(__assign(__assign({}, userWithoutPassword), { token: generateJwt(req.user) }));
        }
        catch (err) {
            next(err);
        }
        return [2 /*return*/];
    });
}); });
app.listen(PORT, function () {
    console.log("\uD83D\uDFE2 Servidor corriendo en http://localhost:".concat(PORT));
});
function generateJwt(user) {
    return sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: "1d"
    });
}
console.log("📦 index.ts compilado correctamente");
