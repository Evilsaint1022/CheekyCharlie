// SimpleDeck.js — a safe Deck implementation for Node.js (replaces deckofcards)
class SimpleDeck {
    constructor() {
        this.suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
        this.ranks = ['ACE', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'JACK', 'QUEEN', 'KING'];
        this.cards = [];

        for (const suit of this.suits) {
            for (const rank of this.ranks) {
                this.cards.push({ rank, suit });
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }
}

module.exports = SimpleDeck;
