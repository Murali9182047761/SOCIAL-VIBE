/**
 * Simple Spam Detection Utility
 * Checks for:
 * 1. Excessive capitalization
 * 2. Repeating content
 * 3. Blacklisted spam words (finance scams, clickbait)
 */

exports.detectSpam = (text) => {
    if (!text) return false;

    // 1. Check for suspicious links (too many links)
    const linkMatches = text.match(/https?:\/\//g);
    if (linkMatches && linkMatches.length > 2) return true;

    // 2. Blacklist Check
    const blacklist = [
        "buy now", "click here", "free money", "crypto", "bitcoin",
        "make money fast", "viagra", "casino", "lottery",
        "verify your account", "urgent", "winner"
    ];

    const lowerText = text.toLowerCase();
    for (const word of blacklist) {
        if (lowerText.includes(word)) return true;
    }

    // 3. Excessive Capitalization (> 70% caps if length > 10)
    if (text.length > 10) {
        const capsCount = text.replace(/[^A-Z]/g, "").length;
        if (capsCount / text.length > 0.7) return true;
    }

    return false;
};

exports.detectFakeAccount = (email, name) => {
    // 1. Disposable Email Domains
    const disposableDomains = ["tempmail.com", "throwawaymail.com", "mailinator.com", "10minutemail.com"];
    const emailDomain = email.split("@")[1];

    if (disposableDomains.includes(emailDomain)) return true;

    // 2. Suspicious Name Patterns (e.g. "User1231238912")
    // Check if name has more than 4 trailing digits
    if (/\d{4,}$/.test(name)) return true;

    return false;
};

/**
 * Toxicity Detection Utility
 * Checks for:
 * 1. Profanity / Hate Speech words (Basic List)
 * 2. Aggressive patterns (ALL CAPS + "!" ?)
 */
exports.detectToxicity = (text) => {
    if (!text) return false;

    const toxicWords = [
        "hate", "stupid", "idiot", "kill", "die", "ugly",
        "fat", "racist", "scam", "nasty", "dumb", "trash", "useless","brutal"
        // Add more real-world toxic words as needed for demo
    ];

    const lowerText = text.toLowerCase();

    // 1. Check for toxic keywords
    for (const word of toxicWords) {
        // Simple word boundary check to avoid partial matches like "scamper"
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(lowerText)) return true;
    }

    return false;
};

/**
 * Sentiment / Wellness Analysis
 * Returns 'positive', 'negative', or 'neutral'
 */
exports.analyzeSentiment = (text) => {
    if (!text) return "neutral";
    const lowerText = text.toLowerCase();

    const positiveWords = [
        "love", "happy", "great", "awesome", "beautiful", "blessed",
        "grateful", "excited", "peace", "calm", "relax", "joy",
        "hope", "inspire", "motivated", "proud", "wonderful", "friend",
        "support", "kind", "growth", "positivity", "mental health", "break"
    ];

    const negativeWords = [
        "sad", "depressed", "angry", "hate", "upset", "fail",
        "annoying", "bad", "terrible", "awful", "stress",
        "anxious", "pain", "hurt", "worst", "broken", "lonely"
    ];

    let score = 0;

    // Very basic scoring
    for (const w of positiveWords) {
        if (lowerText.includes(w)) score++;
    }
    for (const w of negativeWords) {
        if (lowerText.includes(w)) score--;
    }

    if (score > 0) return "positive";
    if (score < 0) return "negative";
    return "neutral";
};
