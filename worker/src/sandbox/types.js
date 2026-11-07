"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Verdict = void 0;
var Verdict;
(function (Verdict) {
    Verdict["PENDING"] = "PENDING";
    Verdict["PROCESSING"] = "PROCESSING";
    Verdict["ACCEPTED"] = "ACCEPTED";
    Verdict["WRONG_ANSWER"] = "WRONG_ANSWER";
    Verdict["TIME_LIMIT_EXCEEDED"] = "TIME_LIMIT_EXCEEDED";
    Verdict["MEMORY_LIMIT_EXCEEDED"] = "MEMORY_LIMIT_EXCEEDED";
    Verdict["COMPILATION_ERROR"] = "COMPILATION_ERROR";
    Verdict["RUNTIME_ERROR"] = "RUNTIME_ERROR";
    Verdict["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(Verdict || (exports.Verdict = Verdict = {}));
