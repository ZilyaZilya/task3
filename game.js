const crypto = require("crypto");
const readlineSync = require("readline-sync");
const AsciiTable = require("ascii-table");

class DiceConfiguration {
   static setupDice(args) {
      if (args.length < 3) {
         throw new Error("You must provide at least 3 dice configurations.");
      }
      return args.map((arg, index) => {
         const values = arg.split(",").map(Number);
         if (values.length !== 6 || values.some(isNaN)) {
            throw new Error(
               `Invalid dice configuration at index ${index + 1}: ${arg}`
            );
         }
         return new GameDice(values);
      });
   }
}

class GameDice {
   constructor(values) {
      this.values = values;
   }

   roll() {
      const index = RandomGenerator.generateNumber(0, 5);
      return this.values[index];
   }
}

class RandomGenerator {
   static generateKey() {
      return crypto.randomBytes(32);
   }

   static generateNumber(min, max) {
      const key = this.generateKey();
      const randomInt = crypto.randomInt(min, max + 1);
      const hmac = crypto
         .createHmac("sha3-256", key)
         .update(randomInt.toString())
         .digest("hex");
      console.log(`HMAC: ${hmac}`);
      this.lastKey = key;
      this.lastNumber = randomInt;
      return randomInt;
   }

   static showHMACKey() {
      console.log(`Secret Key: ${this.lastKey.toString("hex")}`);
      console.log(`Computer's choice: ${this.lastNumber}`);
   }
}

class WinProbability {
   static determineWinRate(diceA, diceB) {
      let winCount = 0;
      for (let x of diceA.values) {
         for (let y of diceB.values) {
            if (x > y) winCount++;
         }
      }
      return (winCount / 36).toFixed(4);
   }
}

class GameGuide {
   static generateTable(diceList) {
      const table = new AsciiTable("Probability of the win for the user:");
      const headers = ["User GameDice"].concat(
         diceList.map((_, i) => `GameDice ${i + 1}`)
      );
      table.setHeading(...headers);

      diceList.forEach((userDice, i) => {
         const row = [`GameDice ${i + 1}`];
         diceList.forEach((compDice, j) => {
            if (i === j) {
               row.push("- (0.3333)");
            } else {
               const prob = WinProbability.determineWinRate(userDice, compDice);
               row.push(prob);
            }
         });
         table.addRow(...row);
      });

      console.log(table.toString());
   }
}

class Game {
   constructor(diceList) {
      this.diceList = diceList;
   }

   start() {
      console.log("Determining who chooses the dice first...");
      const userChoice = readlineSync.keyInYNStrict("Heads (0) or Tails (1)?");
      const coinFlip = RandomGenerator.generateNumber(0, 1);

      RandomGenerator.showHMACKey();

      const userGoesFirst = userChoice === (coinFlip === 0);
      console.log(userGoesFirst ? "You go first!" : "Computer goes first!");

      let userDice = [...this.diceList];
      let computerDice = [...this.diceList];

      let userScore = 0;
      let computerScore = 0;

      while (userDice.length > 0 && computerDice.length > 0) {
         console.log("\n--- New Round ---");

         let userDiceIndex = readlineSync.keyInSelect(
            userDice.map((_, i) => `GameDice ${i + 1}`),
            "Choose your dice:",
            {cancel: false}
         );
         const userRoll = userDice[userDiceIndex].roll();
         console.log(`You rolled: ${userRoll}`);
         userDice.splice(userDiceIndex, 1);

         if (computerDice.length > 0) {
            const compDiceIndex = RandomGenerator.generateNumber(
               0,
               computerDice.length - 1
            );
            const compRoll = computerDice[compDiceIndex].roll();
            console.log(`Computer rolled: ${compRoll}`);
            computerDice.splice(compDiceIndex, 1);

            if (userRoll > compRoll) {
               console.log("You win this round!");
               userScore++;
            } else if (userRoll < compRoll) {
               console.log("Computer wins this round!");
               computerScore++;
            } else {
               console.log("This round is a tie!");
            }
         }
      }

      console.log("\n--- Game Over ---");
      console.log(`Final Score: You ${userScore} - ${computerScore} Computer`);

      if (userScore > computerScore) {
         console.log("Congratulations, you win the game!");
      } else if (userScore < computerScore) {
         console.log("Computer wins the game!");
      } else {
         console.log("It's a tie overall!");
      }

      if (userDice.length > 0) {
         console.log("One die is left unused for the user.");
      } else if (computerDice.length > 0) {
         console.log("One die is left unused for the computer.");
      }

      console.log("Thank you for playing!");
   }
}

try {
   const diceList = DiceConfiguration.setupDice(process.argv.slice(2));
   const game = new Game(diceList);

   if (readlineSync.keyInYNStrict("Would you like to see the help table?")) {
      GameGuide.generateTable(diceList);
   }

   game.start();
} catch (error) {
   console.error(`Error: ${error.message}`);
   console.log(
      "Example usage: node game.js 2,2,4,4,9,9 1,1,6,6,8,8 3,3,5,5,7,7"
   );
}
