class PageRank extends MarkovChain {
    constructor() {
        // 7 nodes representing web pages:
        // 0: Hub (important page with many incoming links)
        // 1-3: Quality pages that link to Hub
        // 4: Fake important page (has incoming links from 5,6)
        // 5-6: Low-quality pages that only link to Fake page

        const dampingFactor = 0.85;
        const teleportProb = (1 - dampingFactor) / 7; // Uniform teleportation

        // Define the link structure
        const links = {
            0: [1, 2, 3],        // Hub links to quality pages
            1: [0, 2, 4],        // Quality page 1 links back to Hub, to page 2, and to Fake
            2: [0, 1, 3],        // Quality page 2 links to Hub, page 1, page 3
            3: [0, 2],           // Quality page 3 links to Hub and page 2
            4: [1],              // Fake page only links to page 1 (minimal outlinks)
            5: [4],              // Low-quality page links only to Fake
            6: [4]               // Low-quality page links only to Fake
        };

        // Create transition matrix
        const numPages = 7;
        const transitionMatrix = [];

        for (let i = 0; i < numPages; i++) {
            const row = new Array(numPages).fill(teleportProb);
            const outLinks = links[i];
            const linkProb = dampingFactor / outLinks.length;

            // Add link probabilities
            for (const target of outLinks) {
                row[target] += linkProb;
            }

            transitionMatrix.push(row);
        }

        super({
            name: "PageRank",
            description: `PageRank algorithm (damping=${dampingFactor}). Shows how link structure affects page importance.`,
            states: [0, 1, 2, 3, 4, 5, 6],
            stateNames: ['Hub', 'Quality1', 'Quality2', 'Quality3', 'Fake★', 'Spam1', 'Spam2'],
            transitionMatrix: transitionMatrix,
            initialDistribution: new Array(numPages).fill(1/numPages)  // Uniform start
        });

        this.dampingFactor = dampingFactor;
        this.links = links;
    }

    getNodePositions(centerX, centerY, radius) {
        // Custom layout to show the network structure clearly
        const positions = [
            { x: centerX, y: centerY - 80 },           // 0: Hub (center top)
            { x: centerX - 120, y: centerY + 20 },     // 1: Quality1 (left)
            { x: centerX, y: centerY + 80 },           // 2: Quality2 (bottom)
            { x: centerX + 120, y: centerY + 20 },     // 3: Quality3 (right)
            { x: centerX + 200, y: centerY - 80 },     // 4: Fake (right top)
            { x: centerX + 280, y: centerY - 40 },     // 5: Spam1 (far right upper)
            { x: centerX + 280, y: centerY - 120 }     // 6: Spam2 (far right lower)
        ];
        return positions;
    }

    getTheoreticalSteadyState() {
        // Approximate PageRank values - Hub should be highest, Fake should be lower than expected
        // These are rough estimates based on the graph structure
        return [0.285, 0.175, 0.175, 0.145, 0.095, 0.062, 0.062];
    }

    getRenderConfig() {
        return {
            canvasHeight: 450,
            showStats: true,
            showTransitionMatrix: false,  // Too cluttered to show
            showEdgeLabels: false         // Clean look without probability labels
        };
    }

    getEdgeRenderMode() {
        return 'curved_all'; // Use curved edges for cleaner visualization
    }

    // Override to show custom information about the network structure
    getCustomInfo() {
        return {
            title: "Network Analysis",
            content: [
                "• Hub: Receives links from quality pages → High PageRank",
                "• Quality pages: Well-connected to each other → Medium PageRank",
                "• Fake★: Gets links from spam pages, but they're not important → Low PageRank",
                "• Spam pages: Only link to Fake page → Very low PageRank",
                "",
                "This shows why link quality matters more than quantity!"
            ]
        };
    }
}

chainModules.push(PageRank);