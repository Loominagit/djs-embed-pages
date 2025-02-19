/** 
 * Forked by Loominagit; I added some extra features, like you can go 10 pages forward and backward,
 * and help reaction if user don't know how to navigate with embed page.
 * 
 * I've also fixed a bug where user reaction doesn't get removed once the user reacted to the message.
 */

const { MessageEmbed } = require("discord.js");

/**
 * Options used to determine how to embed pages should be constructed.
 * @typedef {Object} PagesOptions
 * @prop {Array} pages - An array of message embed that will be in the embed pages.
 * @prop {Discord.TextChannel} channel - The channel the embed pages will be sent.
 * @prop {Number} [duration=60000] - The length the reaction collector will last.
 * @prop {Array<Snowflake>|String<Snowflake>|Function} [restricted] - The restricted users to the embed pages.
 * @prop {Boolean} [pageFooter=true] - Whether or not to have the page counter on the embed footer.
 */

const helpEmbed = new MessageEmbed()
    .setTitle("Embed Pages Navigation")
    .setDescription(`**React:**
⏮️ to go 10 pages backwards.
◀️ to go 1 page backward.
▶️ to go 1 page forward.
⏭️ to go 10 pages forwards.
⏹ to stop the navigation.
ℹ️ to display this embed again.    
    `)
    .setFooter("You are currently using this help embed. React ℹ️ again to continue navigating.")

class DiscordEmbedPages {
    /**
     * Constructs a new embed page.
     * @param {PagesOptions} options - Options for the embed pages. 
     */
    constructor({
        pages,
        channel,
        duration,
        restricted,
        pageFooter,
    } = {}) {
        /**
         * List of pages for the embed pages.
         * @type {Array<Discord.MessageEmbed>}
         */
        this.pages = pages;

        /**
         * Channel to send the embed pages to.
         * @type {Discord.TextChannel}
         */
        this.channel = channel;

        /**
         * How long the reactions collector will last in milliseconds.
         * @type {Number}
         */
        this.duration = duration || 60000;

        /**
         * Only user's that can use the embed reactions.
         * @type {Array<Snowflake>|String<Snowflake>|Function}
         */
        this.restricted = restricted;

        /**
         * Whether to have a page counter on the embed footers.
         * @type {Boolean}
         */
        this.pageFooter = pageFooter || true;

        /**
         * The current page number to embed pages is on.
         * @type {Number}
         */
        this.currentPageNumber = 0;

        /**
         * Indicates if user is using help section of the page embed.
         * @type {Boolean}
         */
        this.usingHelpEmbed = false;
    }

    /**
     * Creates and sends the embed pages.
     */
    createPages() {
        if (!this.pages.length) throw new Error("Tried to create embed pages with no pages in the pages array.");
        if (this.pageFooter) this.pages[0].setFooter(`Page: 1/${this.pages.length}`);
        this.channel.send({ embed: this.pages[0] }).then(msg => {
            this.msg = msg;
            try {
                msg.react("⏮️");
                msg.react("◀️");
                msg.react("▶️");
                msg.react("⏭️");
                msg.react("⏹");
                msg.react("ℹ️");
            } catch(error) {
                console.error(`Some emojis failed to react: ${error}`);
            };
            const filter = (reaction, user) => {
                if (user.bot) return false;
                if (!this.restricted) return true;
                else if (this.restricted instanceof Function) return this.restricted(user);
                else if (Array.isArray(this.restricted) && this.restricted.includes(user.id)) return true;
                else if (typeof this.restricted === "string" && this.restricted === user.id) return true;
            };
            const collector = msg.createReactionCollector(filter, { time: this.duration });
            collector.on("collect", (reaction, user) => {
                //remove user reaction
                reaction.users.remove(user.id);

                // process user request.
                switch(reaction.emoji.name) {
                    case "⏭️":
                        this.goToPage(this.currentPageNumber + 10);
                        break;
                    case "▶️":
                        this.nextPage();
                        break;
                    case "◀️":
                        this.previousPage();
                        break;
                    case "⏮️":
                        this.goToPage(this.currentPageNumber - 10);
                        break;
                    case "⏹":
                        collector.stop();
                        break;
                    case "ℹ️":
                        this.toggleHelpEmbed();
                        break;
                };
            });
            collector.on("end", () => {
                this.msg.reactions.removeAll();
            });
        });
    }

    /**
     * Go to the next page.
     */
    nextPage() {
        if (!this.msg) throw new Error("Tried to go to next page but embed pages havn't been created yet.");
        if (this.usingHelpEmbed) return console.log(`${this.msg.id} @ #${this.msg.channel.name} - Attempting to navigate embed pages when user is currently using help embed.`);
        this.currentPageNumber++;
        if (this.currentPageNumber >= this.pages.length) this.currentPageNumber = 0;
        const embed = this.pages[this.currentPageNumber];
        if (this.pageFooter) embed.setFooter(`Page: ${this.currentPageNumber + 1}/${this.pages.length}`);
        this.msg.edit({ embed: embed });
    }

    /**
     * Go to to the previous page.
     */
    previousPage() {
        if (!this.msg) throw new Error("Tried to go to previous page but embed pages havn't been created yet.");
        if (this.usingHelpEmbed) return console.log(`${this.msg.id} @ #${this.msg.channel.name} - Attempting to navigate embed pages when user is currently using help embed.`);
        this.currentPageNumber--;
        if (this.currentPageNumber < 0) this.currentPageNumber = this.pages.length - 1;
        const embed = this.pages[this.currentPageNumber];
        if (this.pageFooter) embed.setFooter(`Page: ${this.currentPageNumber + 1}/${this.pages.length}`);
        this.msg.edit({ embed: embed });
    }

    /**
     * Adds a page to the embed pages.
     * @param {Discord.MessageEmbed} embed - Embed that is added to the embed pages.
     */
    addPage(embed) {
        if (!this.msg) throw new Error("Tried to add page before embed pages have even been created.");
        if (this.usingHelpEmbed) return console.log(`${this.msg.id} @ #${this.msg.channel.name} - Attempting to add an embed page when user is currently using help embed.`);
        if (!(embed instanceof MessageEmbed)) throw new Error("Adding embed is not a instance of a message embed.");
        this.pages.push(embed);
        const currentEmbed = this.pages[this.currentPageNumber];
        if (this.pageFooter) currentEmbed.setFooter(`Page: ${this.currentPageNumber + 1}/${this.pages.length}`);
        this.msg.edit({ embed: currentEmbed });
    }

    /**
     * Removes a page from the embed pages.
     * @param {Number} pageNumber - The page index that is removed.
     */
    deletePage(pageNumber) {
        if (!this.msg) throw new Error("Tried to delete page before embed pages have even been created.");
        if (this.usingHelpEmbed) return console.log(`${this.msg.id} @ #${this.msg.channel.name} - Attempting to delete an embed page when user is currently using help embed.`);
        if (pageNumber < 0 || pageNumber > this.pages.length - 1) throw new Error("Deleting page does not exist.");
        this.pages.splice(pageNumber, 1);
        if (this.pages.length === this.currentPageNumber) {
            this.currentPageNumber--;
            const embed = this.pages[this.currentPageNumber];
            if (!embed) return this.delete();
            if (this.pageFooter) embed.setFooter(`Page: ${this.currentPageNumber + 1}/${this.pages.length}`);
            this.msg.edit({ embed: embed });
        }
        else {
            const embed = this.pages[this.currentPageNumber];
            if (this.pageFooter) embed.setFooter(`Page: ${this.currentPageNumber + 1}/${this.pages.length}`);
            this.msg.edit({ embed: embed });
        }
    }

    /**
     * Go to a certain embed page.
     * @param {Number} pageNumber - The page index that is turned to.
     */
    goToPage(pageNumber) {
        if (!this.msg) throw new Error("Tried to turn to page before embed pages have even been created.");
        if (this.usingHelpEmbed) return console.log(`${this.msg.id} @ #${this.msg.channel.name} - Attempting to navigate embed pages when user is currently using help embed.`);
        if (pageNumber > this.pages.length - 1) {
            this.currentPageNumber = this.pages.length - 1;
        } else if (pageNumber < 0) {
            this.currentPageNumber = 0;
        } else {
            this.currentPageNumber = pageNumber;
        };
        const embed = this.pages[this.currentPageNumber];
        if (this.pageFooter) embed.setFooter(`Page: ${this.currentPageNumber + 1}/${this.pages.length}`);
        this.msg.edit({ embed: embed });
    }

    /**
     * Toggles help embed.
     */

    toggleHelpEmbed() {
        if (!this.msg) throw new Error("Tried to toggle help embed before embed pages have even been created.");
        this.usingHelpEmbed = !this.usingHelpEmbed;
      
        if (this.usingHelpEmbed) {
            this.msg.edit({ embed: helpEmbed });
        } else {
            this.msg.edit({ embed: this.pages[this.currentPageNumber] })
        };
    };

    /**
     * Deletes the embed pages.
     */
    delete() {
        if (!this.msg) throw new Error("Tried to delete embed pages but they havn't even been created yet.");
        this.msg.delete();
    }
}

module.exports = DiscordEmbedPages;
