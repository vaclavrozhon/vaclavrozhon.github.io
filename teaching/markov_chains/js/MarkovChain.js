class MarkovChain {
    constructor(config) {
        this.name = config.name;
        this.description = config.description;
        this.states = config.states;
        this.transitionMatrix = config.transitionMatrix;
        this.stateNames = config.stateNames || this.states.map((_, i) => `S${i}`);
        this.stateColors = config.stateColors || this.generateDefaultColors();
        this.initialDistribution = config.initialDistribution || this.getUniformDistribution();

        this.numDots = 100;
        this.dots = [];
        this.stateCount = new Array(this.states.length).fill(0);
        this.stepCount = 0;
        this.transitionCount = {};
        this.animationSpeed = 1.0; // Speed multiplier for animations
        this.initializeDots();
    }

    generateDefaultColors() {
        const defaultColors = ['#E0E0E0', '#E0E0E0', '#E0E0E0', '#E0E0E0', '#E0E0E0', '#E0E0E0', '#E0E0E0', '#E0E0E0'];
        return this.states.map((_, i) => defaultColors[i % defaultColors.length]);
    }

    getUniformDistribution() {
        const prob = 1 / this.states.length;
        return new Array(this.states.length).fill(prob);
    }

    initializeDots() {
        this.dots = [];
        this.stateCount = new Array(this.states.length).fill(0);
        this.stepCount = 0;
        this.transitionCount = {};

        for (let i = 0; i < this.numDots; i++) {
            const initialState = this.chooseInitialState();
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 25;
            this.dots.push({
                currentState: initialState,
                nextState: initialState,
                history: [initialState],
                x: radius * Math.cos(angle),
                y: radius * Math.sin(angle),
                targetX: null,
                targetY: null,
                animationProgress: 1,
                isMoving: false
            });
            this.stateCount[initialState]++;
        }
    }

    chooseInitialState() {
        const rand = Math.random();
        let cumSum = 0;
        for (let i = 0; i < this.states.length; i++) {
            cumSum += this.initialDistribution[i];
            if (rand < cumSum) {
                return i;
            }
        }
        return this.states.length - 1;
    }

    step() {
        const newTransitions = {};

        for (let dot of this.dots) {
            if (dot.isMoving) continue; // Skip dots that are still animating

            const currentState = dot.currentState;
            const rand = Math.random();
            let cumSum = 0;
            let nextState = currentState;

            for (let i = 0; i < this.states.length; i++) {
                cumSum += this.transitionMatrix[currentState][i];
                if (rand < cumSum) {
                    nextState = i;
                    break;
                }
            }

            const transKey = `${currentState}->${nextState}`;
            newTransitions[transKey] = (newTransitions[transKey] || 0) + 1;

            if (nextState !== currentState) {
                // Moving to a different state
                dot.nextState = nextState;
                dot.isMoving = true;
                dot.animationProgress = 0;

                // Calculate target position in the new state
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 25;
                dot.targetX = radius * Math.cos(angle);
                dot.targetY = radius * Math.sin(angle);
            } else {
                // Staying in the same state: animate within-state movement and block further steps until done
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 25;
                dot.targetX = radius * Math.cos(angle);
                dot.targetY = radius * Math.sin(angle);
                dot.animationProgress = 0;
                dot.isMoving = true;
            }

            dot.history.push(nextState);
        }

        this.transitionCount = newTransitions;
        this.stepCount++;
    }

    animate(deltaTime = 16) {
        // Calculate animation speed based on deltaTime (ms since last frame)
        // Base speed: complete animation in ~500ms, adjusted by speed multiplier
        const baseAnimationSpeed = 1000 / 500; // animations per second
        const animationIncrement = (baseAnimationSpeed * this.animationSpeed * deltaTime) / 1000;

        for (let i = 0; i < this.dots.length; i++) {
            const dot = this.dots[i];
            if (dot.animationProgress < 1) {
                dot.animationProgress = Math.min(1, dot.animationProgress + animationIncrement);

                if (dot.isMoving && dot.nextState !== dot.currentState) {
                    // Animate movement between states
                    const progress = this.easeInOutQuad(dot.animationProgress);

                    if (dot.animationProgress >= 1) {
                        // Animation complete
                        this.stateCount[dot.currentState]--;
                        this.stateCount[dot.nextState]++;
                        dot.currentState = dot.nextState;
                        dot.x = dot.targetX;
                        dot.y = dot.targetY;
                        dot.isMoving = false;
                        if (typeof this.onArrival === 'function') {
                            try { this.onArrival(i, dot.currentState); } catch (e) { /* ignore */ }
                        }
                    }
                } else if (dot.isMoving && dot.targetX !== null && dot.targetY !== null) {
                    // Animate position change within same state
                    const progress = this.easeInOutQuad(dot.animationProgress);
                    dot.x = dot.x + (dot.targetX - dot.x) * progress;
                    dot.y = dot.y + (dot.targetY - dot.y) * progress;

                    if (dot.animationProgress >= 1) {
                        dot.isMoving = false;
                    }
                }
            }
        }
    }

    draw(ctx, width, height, highlightOptions) {
        // Clearing happens in the render loop to respect transforms

        const centerX = width / 2;
        const centerY = height / 2;
        let radius = Math.min(width, height) * 0.3;

        // Get initial positions
        let positions = this.getNodePositions ? this.getNodePositions(centerX, centerY, radius, width) : this.getDefaultNodePositions(centerX, centerY, radius);

        // Check if positions fit within canvas bounds and scale if necessary
        const nodeRadius = this.getNodeRadius();
        const padding = nodeRadius + 20;

        let minX = Math.min(...positions.map(p => p.x));
        let maxX = Math.max(...positions.map(p => p.x));
        let minY = Math.min(...positions.map(p => p.y));
        let maxY = Math.max(...positions.map(p => p.y));

        // Calculate required space vs available space
        const requiredWidth = maxX - minX + 2 * padding;
        const requiredHeight = maxY - minY + 2 * padding;

        // Calculate scale factors (never scale up, only down)
        const scaleX = requiredWidth > width ? width / requiredWidth : 1.0;
        const scaleY = requiredHeight > height ? height / requiredHeight : 1.0;
        const scale = Math.min(scaleX, scaleY);

        if (scale < 1.0) {
            // Apply uniform scaling to all positions
            const scaledCenterX = centerX;
            const scaledCenterY = centerY;

            positions = positions.map(pos => ({
                x: scaledCenterX + (pos.x - centerX) * scale,
                y: scaledCenterY + (pos.y - centerY) * scale
            }));
        }

        // Expose positions for hit-testing
        this._lastPositions = positions;

        const hoveredIndex = highlightOptions && Number.isInteger(highlightOptions.hoveredIndex)
            ? highlightOptions.hoveredIndex
            : null;

        this.drawTransitions(ctx, positions, hoveredIndex);
        this.drawSelfLoops(ctx, positions, centerX, centerY, hoveredIndex); // Draw self-loops with other edges
        this.drawNodes(ctx, positions);
        this.drawDots(ctx, positions);

        // Optional node highlighting (visual rings) without redrawing arcs
        if (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < this.states.length) {
            this.drawNodeHighlightRings(ctx, positions, hoveredIndex);
        }
    }

    getDefaultNodePositions(centerX, centerY, radius) {
        return this.states.map((_, i) => {
            const angle = (i * 2 * Math.PI) / this.states.length - Math.PI / 2;
            return {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });
    }

    drawTransitions(ctx, positions, hoveredIndex = null) {
        // Draw transitions between different states
        for (let i = 0; i < this.states.length; i++) {
            for (let j = i + 1; j < this.states.length; j++) {
                const hasForward = this.transitionMatrix[i][j] > 0;
                const hasBackward = this.transitionMatrix[j][i] > 0;

                if (!hasForward && !hasBackward) continue;

                const from = positions[i];
                const to = positions[j];

                if (hasForward && hasBackward) {
                    // Draw curved arrows for bidirectional transitions
                    const dx = to.x - from.x;
                    const dy = to.y - from.y;
                    const perpX = -dy * 0.15;
                    const perpY = dx * 0.15;

                    // Forward arrow (curved)
                    const forwardHighlighted = hoveredIndex === i;
                    ctx.strokeStyle = forwardHighlighted ? '#ff5722' : '#999';
                    ctx.lineWidth = forwardHighlighted ? 3 : 2;
                    const cpF = { x: from.x + dx * 0.5 + perpX, y: from.y + dy * 0.5 + perpY };
                    ctx.beginPath();
                    ctx.moveTo(from.x, from.y);
                    ctx.quadraticCurveTo(cpF.x, cpF.y, to.x, to.y);
                    ctx.stroke();

                    const { r, pad } = this._getNodeRadiusWithPad();
                    let { tip, angle } = this._placeArrowOnQuadratic(from, cpF, to, to, r, pad);
                    ctx.save();
                    ctx.translate(tip.x, tip.y);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-8, -4);
                    ctx.lineTo(-8, 4);
                    ctx.closePath();
                    ctx.fillStyle = forwardHighlighted ? '#ff5722' : '#666';
                    ctx.fill();
                    ctx.restore();

                    // Backward arrow (curved)
                    const backwardHighlighted = hoveredIndex === j;
                    ctx.strokeStyle = backwardHighlighted ? '#ff5722' : '#999';
                    ctx.lineWidth = backwardHighlighted ? 3 : 2;
                    const cpB = { x: from.x + dx * 0.5 - perpX, y: from.y + dy * 0.5 - perpY };
                    ctx.beginPath();
                    ctx.moveTo(to.x, to.y);
                    ctx.quadraticCurveTo(cpB.x, cpB.y, from.x, from.y);
                    ctx.stroke();

                    ({ tip, angle } = this._placeArrowOnQuadratic(to, cpB, from, from, r, pad));
                    ctx.save();
                    ctx.translate(tip.x, tip.y);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-8, -4);
                    ctx.lineTo(-8, 4);
                    ctx.closePath();
                    ctx.fillStyle = backwardHighlighted ? '#ff5722' : '#666';
                    ctx.fill();
                    ctx.restore();

                    // Labels
                    if (this.getRenderConfig().showEdgeLabels) {
                    ctx.fillStyle = '#666';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(this.transitionMatrix[i][j].toFixed(2), cpF.x, cpF.y - 3);
                    ctx.fillText(this.transitionMatrix[j][i].toFixed(2), cpB.x, cpB.y - 3);
                    }

                } else if (hasForward) {
                    // Single direction arrow or curved if chain requests
                    const mode = this.getEdgeRenderMode();
                    if (mode === 'curved_all') {
                        const dx = to.x - from.x;
                        const dy = to.y - from.y;
                        const perpX = -dy * 0.15;
                        const perpY = dx * 0.15;
                        const highlighted = hoveredIndex === i;
                        ctx.strokeStyle = highlighted ? '#ff5722' : '#999';
                        ctx.lineWidth = highlighted ? 3 : 2;
                        const { r, pad } = this._getNodeRadiusWithPad();
                        const cpF = { x: from.x + dx * 0.5 + perpX, y: from.y + dy * 0.5 + perpY };
                        ctx.beginPath();
                        ctx.moveTo(from.x, from.y);
                        ctx.quadraticCurveTo(cpF.x, cpF.y, to.x, to.y);
                        ctx.stroke();

                        const { tip, angle } = this._placeArrowOnQuadratic(from, cpF, to, to, r, pad);
                        ctx.save();
                        ctx.translate(tip.x, tip.y);
                        ctx.rotate(angle);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-8, -4);
                        ctx.lineTo(-8, 4);
                        ctx.closePath();
                        ctx.fillStyle = highlighted ? '#ff5722' : '#666';
                        ctx.fill();
                        ctx.restore();

                        // label near control point
                        if (this.getRenderConfig().showEdgeLabels) {
                            ctx.fillStyle = highlighted ? '#ff5722' : '#666';
                            ctx.font = '12px Arial';
                            ctx.textAlign = 'center';
                            ctx.fillText(this.transitionMatrix[i][j].toFixed(2), cpF.x, cpF.y - 5);
                        }
                    } else {
                        const highlighted = hoveredIndex === i;
                        ctx.strokeStyle = highlighted ? '#ff5722' : '#999';
                        ctx.lineWidth = highlighted ? 3 : 2;

                        const { r, pad } = this._getNodeRadiusWithPad();
                        const seg = this._shrinkSegmentToNodes(from, to, r, r, pad);

                        ctx.beginPath();
                        ctx.moveTo(seg.a.x, seg.a.y);
                        ctx.lineTo(seg.b.x, seg.b.y);
                        ctx.stroke();

                        const { tip, angle } = this._placeArrowOnStraight(seg.a, seg.b, 0, 0);
                        ctx.save();
                        ctx.translate(tip.x, tip.y);
                        ctx.rotate(angle);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-10, -5);
                        ctx.lineTo(-10, 5);
                        ctx.closePath();
                        ctx.fillStyle = highlighted ? '#ff5722' : '#666';
                        ctx.fill();
                        ctx.restore();

                    const midX = (from.x + to.x) / 2;
                    const midY = (from.y + to.y) / 2;

                        if (this.getRenderConfig().showEdgeLabels) {
                            ctx.fillStyle = highlighted ? '#ff5722' : '#666';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(this.transitionMatrix[i][j].toFixed(2), midX, midY - 5);
                        }
                    }
                } else if (hasBackward) {
                    // Single direction arrow in the reverse direction (j -> i) or curved if chain requests
                    const mode = this.getEdgeRenderMode();
                    if (mode === 'curved_all') {
                        const dx = to.x - from.x;
                        const dy = to.y - from.y;
                        const perpX = -dy * 0.15;
                        const perpY = dx * 0.15;
                        const highlighted = hoveredIndex === j;
                        ctx.strokeStyle = highlighted ? '#ff5722' : '#999';
                        ctx.lineWidth = highlighted ? 3 : 2;
                        const { r, pad } = this._getNodeRadiusWithPad();
                        const cpB = { x: from.x + dx * 0.5 - perpX, y: from.y + dy * 0.5 - perpY };
                        ctx.beginPath();
                        ctx.moveTo(to.x, to.y);
                        ctx.quadraticCurveTo(cpB.x, cpB.y, from.x, from.y);
                        ctx.stroke();

                        const { tip, angle } = this._placeArrowOnQuadratic(to, cpB, from, from, r, pad);
                        ctx.save();
                        ctx.translate(tip.x, tip.y);
                        ctx.rotate(angle);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-8, -4);
                        ctx.lineTo(-8, 4);
                        ctx.closePath();
                        ctx.fillStyle = highlighted ? '#ff5722' : '#666';
                        ctx.fill();
                        ctx.restore();

                        if (this.getRenderConfig().showEdgeLabels) {
                            ctx.fillStyle = highlighted ? '#ff5722' : '#666';
                            ctx.font = '12px Arial';
                            ctx.textAlign = 'center';
                            ctx.fillText(this.transitionMatrix[j][i].toFixed(2), cpB.x, cpB.y - 5);
                        }
                    } else {
                        const highlighted = hoveredIndex === j;
                        ctx.strokeStyle = highlighted ? '#ff5722' : '#999';
                        ctx.lineWidth = highlighted ? 3 : 2;

                        const { r, pad } = this._getNodeRadiusWithPad();
                        const seg = this._shrinkSegmentToNodes(to, from, r, r, pad);

                        ctx.beginPath();
                        ctx.moveTo(seg.a.x, seg.a.y);
                        ctx.lineTo(seg.b.x, seg.b.y);
                        ctx.stroke();

                        const { tip, angle } = this._placeArrowOnStraight(seg.a, seg.b, 0, 0);
                        ctx.save();
                        ctx.translate(tip.x, tip.y);
                        ctx.rotate(angle);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-10, -5);
                        ctx.lineTo(-10, 5);
                        ctx.closePath();
                        ctx.fillStyle = highlighted ? '#ff5722' : '#666';
                        ctx.fill();
                        ctx.restore();

                        const midX = (from.x + to.x) / 2;
                        const midY = (from.y + to.y) / 2;

                        if (this.getRenderConfig().showEdgeLabels) {
                            ctx.fillStyle = highlighted ? '#ff5722' : '#666';
                            ctx.font = '12px Arial';
                            ctx.textAlign = 'center';
                            ctx.fillText(this.transitionMatrix[j][i].toFixed(2), midX, midY - 5);
                        }
                    }
                }
            }
        }
    }

    drawSelfLoops(ctx, positions, centerX, centerY, hoveredIndex = null) {
        // Draw self-loops on top of everything else
        for (let i = 0; i < this.states.length; i++) {
            if (this.transitionMatrix[i][i] > 0) {
                this.drawSelfLoop(ctx, positions[i], i, this.transitionMatrix[i][i], centerX, centerY, hoveredIndex);
            }
        }
    }

    drawDots(ctx, positions) {
        ctx.fillStyle = '#FF0000';
        for (let dot of this.dots) {
            let dotX, dotY;

            if (dot.isMoving && dot.nextState !== dot.currentState) {
                // Interpolate position between current and next state
                const currentPos = positions[dot.currentState];
                const nextPos = positions[dot.nextState];
                const progress = this.easeInOutQuad(dot.animationProgress);

                const stateX = currentPos.x + (nextPos.x - currentPos.x) * progress;
                const stateY = currentPos.y + (nextPos.y - currentPos.y) * progress;

                dotX = stateX + dot.x + (dot.targetX - dot.x) * progress;
                dotY = stateY + dot.y + (dot.targetY - dot.y) * progress;
            } else {
                // Dot is in a single state
                const state = positions[dot.currentState];
                dotX = state.x + dot.x;
                dotY = state.y + dot.y;
            }

            ctx.beginPath();
            ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    drawNodes(ctx, positions) {
        const nodeRadius = this.getNodeRadius();
        for (let i = 0; i < this.states.length; i++) {
            const pos = positions[i];

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
            ctx.fillStyle = '#E0E0E0';
            ctx.fill();
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.stateNames[i], pos.x, pos.y);
        }
    }

    getStateProbabilities() {
        return this.stateCount.map(count => count / this.numDots);
    }

    reset() {
        this.initializeDots();
    }

    setNumDots(num) {
        this.numDots = num;
        this.initializeDots();
    }

    setAnimationSpeed(stepIntervalMs) {
        // Convert step interval to animation speed multiplier
        // Faster stepping (lower interval) = faster animations
        // Base: 500ms interval = 1.0x speed
        this.animationSpeed = 500 / stepIntervalMs;
    }

    updateTransitionMatrix(newMatrix) {
        // Validate that each row sums to 1 (within tolerance)
        for (let i = 0; i < newMatrix.length; i++) {
            const rowSum = newMatrix[i].reduce((sum, val) => sum + val, 0);
            if (Math.abs(rowSum - 1.0) > 0.001) {
                throw new Error(`Row ${i} does not sum to 1.0 (sum = ${rowSum.toFixed(3)})`);
            }
        }

        this.transitionMatrix = newMatrix.map(row => [...row]); // Deep copy
        return true;
    }

    drawSelfLoop(ctx, position, stateIndex, probability, centerX, centerY, hoveredIndex = null) {
        // Compute outward and perpendicular directions based on canvas center
        let ux = position.x - centerX;
        let uy = position.y - centerY;
        const len = Math.hypot(ux, uy);
        if (len < 1e-6) {
            // Fallback if node is at center
            ux = 0; uy = -1;
        } else {
            ux /= len; uy /= len;
        }
        const vx = -uy; // rotate (ux,uy) by +90° to get perpendicular
        const vy = ux;

        // Helper to map local loop coordinates to world using basis (v, -u)
        const mapLocal = (dx, dy) => ({
            x: position.x + dx * vx - dy * ux,
            y: position.y + dx * vy - dy * uy
        });

        const { r, pad } = this._getNodeRadiusWithPad();

        // Local control points (scaled with r so loop stays outside node)
        const p0 = mapLocal(-20, -10);
        const cp = mapLocal(0, -(r + 70));
        const p2 = mapLocal(20, -10);

        // Draw loop curve with same style as normal arrows
        const highlighted = hoveredIndex === stateIndex;
        ctx.strokeStyle = highlighted ? '#ff5722' : '#999';
        ctx.lineWidth = highlighted ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
        ctx.stroke();

        const { tip, angle } = this._placeArrowOnQuadratic(p0, cp, p2, position, r, pad);
        ctx.save();
        ctx.translate(tip.x, tip.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-8, 4);
        ctx.closePath();
        ctx.fillStyle = highlighted ? '#ff5722' : '#666';
        ctx.fill();
        ctx.restore();

        // Probability label styled like normal arrows (no box)
        if (this.getRenderConfig().showEdgeLabels) {
            ctx.fillStyle = highlighted ? '#ff5722' : '#666';
            ctx.font = '11px Arial';
        ctx.textAlign = 'center';
            ctx.fillText(probability.toFixed(2), cp.x, cp.y - 3);
        }
    }

    // Highlight helpers
    drawOutgoingHighlight(ctx, positions, i) {
        ctx.save();
        ctx.strokeStyle = '#ff5722';
        ctx.fillStyle = '#ff5722';
        ctx.lineWidth = 3;

        for (let j = 0; j < this.states.length; j++) {
            if (this.transitionMatrix[i][j] <= 0 || i === j) continue;
            const a = Math.min(i, j);
            const b = Math.max(i, j);
            const A = positions[a];
            const B = positions[b];
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const perpX = -dy * 0.15;
            const perpY = dx * 0.15;
            const hasForwardAB = this.transitionMatrix[a][b] > 0;
            const hasBackwardBA = this.transitionMatrix[b][a] > 0;

            if (hasForwardAB && hasBackwardBA) {
                // Use curved path consistent with base drawing
                if (i === a) {
                    // i -> j corresponds to forward (A -> B)
                    const cpX = A.x + dx * 0.5 + perpX;
                    const cpY = A.y + dy * 0.5 + perpY;
                    ctx.beginPath();
                    ctx.moveTo(A.x, A.y);
                    ctx.quadraticCurveTo(cpX, cpY, B.x, B.y);
                    ctx.stroke();

                    // Arrowhead along curve
                    const t = 0.85;
                    const qx = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * cpX + t * t * B.x;
                    const qy = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * cpY + t * t * B.y;
                    const ddx = 2 * (1 - t) * (cpX - A.x) + 2 * t * (B.x - cpX);
                    const ddy = 2 * (1 - t) * (cpY - A.y) + 2 * t * (B.y - cpY);
                    const angle = Math.atan2(ddy, ddx);
                    ctx.save();
                    ctx.translate(qx, qy);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-8, -4);
                    ctx.lineTo(-8, 4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                } else {
                    // i -> j corresponds to backward (B -> A)
                    const cpX = A.x + dx * 0.5 - perpX;
                    const cpY = A.y + dy * 0.5 - perpY;
                    ctx.beginPath();
                    ctx.moveTo(B.x, B.y);
                    ctx.quadraticCurveTo(cpX, cpY, A.x, A.y);
                    ctx.stroke();

                    const t = 0.85;
                    const qx = (1 - t) * (1 - t) * B.x + 2 * (1 - t) * t * cpX + t * t * A.x;
                    const qy = (1 - t) * (1 - t) * B.y + 2 * (1 - t) * t * cpY + t * t * A.y;
                    const ddx = 2 * (1 - t) * (cpX - B.x) + 2 * t * (A.x - cpX);
                    const ddy = 2 * (1 - t) * (cpY - B.y) + 2 * t * (A.y - cpY);
                    const angle = Math.atan2(ddy, ddx);
                    ctx.save();
                    ctx.translate(qx, qy);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-8, -4);
                    ctx.lineTo(-8, 4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            } else {
                // Single straight path i -> j
                const from = positions[i];
                const to = positions[j];
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();

                const angle = Math.atan2(to.y - from.y, to.x - from.x);
                const arrowX = to.x - 35 * Math.cos(angle);
                const arrowY = to.y - 35 * Math.sin(angle);
                ctx.save();
                ctx.translate(arrowX, arrowY);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-10, -5);
                ctx.lineTo(-10, 5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    }

    drawNodeHighlightRings(ctx, positions, i) {
        ctx.save();
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 3;
        // hovered node
        ctx.beginPath();
        ctx.arc(positions[i].x, positions[i].y, 34, 0, 2 * Math.PI);
        ctx.stroke();
        // targets
        for (let j = 0; j < this.states.length; j++) {
            if (this.transitionMatrix[i][j] > 0 && i !== j) {
                ctx.beginPath();
                ctx.arc(positions[j].x, positions[j].y, 34, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    drawSelfLoopHighlight(ctx, position, stateIndex, centerX, centerY) {
        // Recompute the same loop geometry as drawSelfLoop, but just the stroke in highlight color
        let ux = position.x - centerX;
        let uy = position.y - centerY;
        const len = Math.hypot(ux, uy);
        if (len < 1e-6) { ux = 0; uy = -1; } else { ux /= len; uy /= len; }
        const vx = -uy; const vy = ux;
        const mapLocal = (dx, dy) => ({ x: position.x + dx * vx - dy * ux, y: position.y + dx * vy - dy * uy });
        const p0 = mapLocal(-20, -10);
        const cp = mapLocal(0, -70);
        const p2 = mapLocal(20, -10);

        ctx.save();
        ctx.strokeStyle = '#ff5722';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    getTheoreticalSteadyState() {
        return null;
    }

    // Compute distribution evolution over n steps
    getDistributionEvolution(steps = 10) {
        const n = this.states.length;
        const evolution = [];

        // Start with initial distribution
        let currentDist = [...this.initialDistribution];
        evolution.push([...currentDist]);

        // Compute distribution at each step
        for (let step = 1; step <= steps; step++) {
            const nextDist = new Array(n).fill(0);

            // Matrix multiplication: nextDist = currentDist * transitionMatrix
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    nextDist[j] += currentDist[i] * this.transitionMatrix[i][j];
                }
            }

            evolution.push([...nextDist]);
            currentDist = nextDist;
        }

        return evolution;
    }

    // Default render configuration; chains can override
    getRenderConfig() {
        return {
            canvasHeight: 400,
            showStats: true,
            showTransitionMatrix: true,
            showEdgeLabels: true
        };
    }

    // Optional editors; override in subclasses to expose editable configs
    getEditors() {
        return [];
    }

    // Edge rendering mode: 'mixed' (default) or 'curved_all'
    getEdgeRenderMode() {
        return 'mixed';
    }

    // Node drawing radius in world units (override via render config in future)
    getNodeRadius() {
        return 30;
    }

    // --- Geometry helpers for precise arrow placement ---
    _getNodeRadiusWithPad() {
        return { r: this.getNodeRadius(), pad: 6 };   // pad = visual gap
    }

    _shrinkSegmentToNodes(p0, p1, r0, r1, pad) {
        // return endpoints of the edge trimmed so it doesn't enter the disks
        const dx = p1.x - p0.x, dy = p1.y - p0.y;
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L;
        return {
            a: { x: p0.x + (r0 + pad) * ux, y: p0.y + (r0 + pad) * uy },
            b: { x: p1.x - (r1 + pad) * ux, y: p1.y - (r1 + pad) * uy },
            angle: Math.atan2(uy, ux)
        };
    }

    _placeArrowOnStraight(from, to, rTo, pad) {
        const dx = to.x - from.x, dy = to.y - from.y;
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L;
        const tip = { x: to.x - (rTo + pad) * ux, y: to.y - (rTo + pad) * uy };
        const angle = Math.atan2(uy, ux);
        return { tip, angle };
    }

    _placeArrowOnQuadratic(p0, cp, p1, target, rTo, pad) {
        // find t where the curve reaches the target circle boundary
        const t = this._findBezierBoundaryT(p0, cp, p1, target, rTo + pad);
        const q  = this._quadraticPoint(p0, cp, p1, t);
        const dq = this._quadraticTangent(p0, cp, p1, t);
        const angle = Math.atan2(dq.y, dq.x);
        return { tip: q, angle };
    }

    // --- Arrowhead helpers (canvas-only, boundary-aware) ---
    _quadraticPoint(p0, cp, p1, t) {
        const mt = 1 - t;
        return {
            x: mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p1.x,
            y: mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p1.y
        };
    }

    _quadraticTangent(p0, cp, p1, t) {
        return {
            x: 2 * (1 - t) * (cp.x - p0.x) + 2 * t * (p1.x - cp.x),
            y: 2 * (1 - t) * (cp.y - p0.y) + 2 * t * (p1.y - cp.y)
        };
    }

    _findBezierBoundaryT(p0, cp, p1, target, radiusPlusPad) {
        // Bisection on t in [0.8, 0.99] to find point near target boundary
        let lo = 0.8, hi = 0.99;
        const dist = (t) => {
            const q = this._quadraticPoint(p0, cp, p1, t);
            const dx = q.x - target.x;
            const dy = q.y - target.y;
            return Math.hypot(dx, dy) - radiusPlusPad;
        };
        let dlo = dist(lo);
        let dhi = dist(hi);
        // If signs are the same, fallback to hi
        if (dlo * dhi > 0) return hi;
        for (let iter = 0; iter < 18; iter++) {
            const mid = (lo + hi) * 0.5;
            const dm = dist(mid);
            if (Math.abs(dm) < 0.5) return mid;
            if (dlo * dm <= 0) {
                hi = mid; dhi = dm;
            } else {
                lo = mid; dlo = dm;
            }
        }
        return (lo + hi) * 0.5;
    }

    _computeStraightTip(from, to, targetRadius, padding) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const tip = {
            x: to.x - (targetRadius + padding) * ux,
            y: to.y - (targetRadius + padding) * uy
        };
        const angle = Math.atan2(uy, ux);
        return { tip, angle };
    }
}