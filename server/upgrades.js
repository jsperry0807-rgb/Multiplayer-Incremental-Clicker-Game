// Define upgrades object
const upgrades = {
    // Basic Tier
    clicker: {
        id: "clicker",
        name: "Auto Clicker",
        cost: 20,
        cps: 1,
        description: "A simple automatic clicking device",
        tier: 1,
        unlocks: ["superClicker"],
        maxOwned: 5,
        type: "generator"
    },
    
    // Mid Tier
    superClicker: {
        id: "superClicker",
        name: "Super Auto Clicker",
        cost: 200,
        cps: 5,
        description: "A more powerful automated clicking device",
        tier: 2,
        requires: ["clicker"],
        unlocks: ["megaClicker", "clickMultiplier"],
        type: "generator"
    },
    
    // Advanced Tier
    megaClicker: {
        id: "megaClicker",
        name: "Mega Auto Clicker",
        cost: 1000,
        cps: 20,
        description: "An industrial-grade clicking machine",
        tier: 3,
        requires: ["superClicker"],
        unlocks: ["quantumClicker"],
        type: "generator"
    },
    
    // Special Upgrades
    clickMultiplier: {
        id: "clickMultiplier",
        name: "Click Multiplier",
        cost: 500,
        cps: 0,
        description: "Doubles the value of each manual click",
        tier: 2,
        requires: ["superClicker"],
        type: "multiplier",
        multiplier: 2,
        appliesTo: "click"
    },
    
    // Legendary Tier
    quantumClicker: {
        id: "quantumClicker",
        name: "Quantum Clicker",
        cost: 10000,
        cps: 100,
        description: "Harnesses quantum fluctuations to generate coins",
        tier: 4,
        requires: ["megaClicker"],
        type: "generator"
    },
    
    // Prestige Upgrades
    bankAccount: {
        id: "bankAccount",
        name: "Bank Account",
        cost: 5000,
        cps: 10,
        description: "Earn interest on your coins",
        tier: 3,
        type: "generator",
        special: "compound"
    },
    
    // Click Power Upgrades
    goldenClick: {
        id: "goldenClick",
        name: "Golden Click",
        cost: 1000,
        cps: 0,
        description: "Chance for golden clicks worth 10x normal",
        tier: 2,
        type: "special",
        effect: "goldenClick",
        chance: 0.05
    }
};

// Function to get available upgrades based on player's current upgrades
export function getAvailableUpgrades(playerUpgrades) {
    const allUpgrades = Object.values(upgrades);  // Use 'upgrades' instead of 'default'
    const available = [];
    
    for (const upgrade of allUpgrades) {
        // Check if already owned
        if (playerUpgrades.includes(upgrade.id)) continue;
        
        // Check requirements
        if (upgrade.requires) {
            const hasRequirements = upgrade.requires.every(req => 
                playerUpgrades.includes(req)
            );
            if (!hasRequirements) continue;
        }
        
        available.push(upgrade);
    }
    
    return available;
}

// Export the upgrades object as default
export default upgrades;
