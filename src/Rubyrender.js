class RubyRender {
    constructor() {
    }

    static DEFAULT_OPTIONS = {
        furigana: true,
        furiganaForms: "[]:^:()|[]::{}",
        furiganaFallbackBrackets: "【】",
        furiganaStrictMode: false,
        furiganaAutoBracketSets: "【】|{}",
        furiganaPatternMatching: true,
    }

    static #kanjiRange = '\\u4e00-\\u9faf';
    static #kanjiBlockRegex = new RegExp(`[${kanjiRange}]+`, 'g');
    static #nonKanjiBlockRegex = new RegExp(`[^${kanjiRange}]+`, 'g');
    static #kanaWithAnnotations = '\\u3041-\\u3095\\u3099-\\u309c\\u3081-\\u30fa\\u30fc';
    static #furiganaSeperators = '.．。・';
    static #seperatorRegex = new RegExp(`[${furiganaSeperators}]`, 'g');
    static #singleKanjiRegex = new RegExp(`^[${kanjiRange}]$`);
    static #innerRegexString = '(?:[^\\u0000-\\u007F]|\\w)+';

    #regexList = [];
    #previousFuriganaForms = '';
    #autoRegexList = [];
    #previousAutoBracketSets = '';
    #replacementTemplate = '';
    #replacementBrackets = '';

    // This function escapes special characters for use in a regex constructor.
    #escapeForRegex = function (string) {
        // return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    }

    #emptyStringFilter = function (block) {
        return block !== ''
    }

    #isKanji(character) {
        return character.match(RubyRender.#singleKanjiRegex);
    }

    #updateRegexList(furiganaForms) {
        this.#previousFuriganaForms = furiganaForms;

        let formArray = furiganaForms.split('|');
        if (formArray.length === 0) {
            formArray = ['[]:^:()'];
        }
        regexList = formArray.map(form => {
            let furiganaComponents = form.split(':');
            if (furiganaComponents.length !== 3) {
                furiganaComponents = ['[]', '^', '()'];
            }
            const mainBrackets = furiganaComponents[0];
            const seperator = furiganaComponents[1];
            const furiganaBrackets = furiganaComponents[2];
            return new RegExp(
                escapeForRegex(mainBrackets[0]) +
                '(' + RubyRender.#innerRegexString + ')' +
                escapeForRegex(mainBrackets[1]) +
                escapeForRegex(seperator) +
                escapeForRegex(furiganaBrackets[0]) +
                '(' + RubyRender.#innerRegexString + ')' +
                escapeForRegex(furiganaBrackets[1]),
                'g'
            );
        });
    }

    #updateAutoRegexList(autoBracketSets) {
        this.#previousAutoBracketSets = autoBracketSets;
        this.#autoRegexList = autoBracketSets.split('|').map(brackets => {
            /*
              Sample built regex:
              /(^|[^\u4e00-\u9faf]|)([\u4e00-\u9faf]+)([\u3041-\u3095\u3099-\u309c\u3081-\u30fa\u30fc]*)【((?:[^【】\u4e00-\u9faf]|w)+)】/g
            */
            return new RegExp(
                `(^|[^${RubyRender.#kanjiRange}]|)` +
                `([${RubyRender.#kanjiRange}]+)` +
                `([${RubyRender.#kanaWithAnnotations}]*)` +
                escapeForRegex(brackets[0]) +
                `((?:[^${escapeForRegex(brackets)}\\u0000-\\u007F]|\\w|[${RubyRender.#furiganaSeperators}])+)` +
                escapeForRegex(brackets[1]),
                'g'
            );
        });
    }

    #updateReplacementTemplate(furiganaFallbackBrackets) {
        if (furiganaFallbackBrackets.length !== 2) {
            furiganaFallbackBrackets = '【】';
        }
        this.#replacementBrackets = furiganaFallbackBrackets;
        this.#replacementTemplate = `<ruby>$1<rp>${furiganaFallbackBrackets[0]}</rp><rt>$2</rt><rp>${furiganaFallbackBrackets[1]}</rp></ruby>`;
    }

    #addText(text, options) {
        if (options.furiganaForms !== this.#previousFuriganaForms) {
            this.#updateRegexList(options.furiganaForms);
        }
        if (options.furiganaFallbackBrackets !== this.#replacementBrackets) {
            this.#updateReplacementTemplate(options.furiganaFallbackBrackets);
        }
        this.#regexList.forEach(regex => {
            text = text.replace(regex, (match, wordText, furiganaText, offset, mainText) => {
                if (match.indexOf('\\') === -1 && mainText[offset - 1] !== '\\') {
                    if ((!options.furiganaPatternMatching) || wordText.search(RubyRender.#kanjiBlockRegex) === -1 || wordText[0].search(RubyRender.#kanjiBlockRegex) === -1) {
                        return this.#replacementTemplate.replace('$1', wordText).replace('$2', furiganaText);
                    } else {
                        let originalFuriganaText = (' ' + furiganaText).slice(1);
                        let nonKanji = wordText.split(RubyRender.#kanjiBlockRegex).filter(this.#emptyStringFilter);
                        let kanji = wordText.split(RubyRender.#nonKanjiBlockRegex).filter(this.#emptyStringFilter);
                        let replacementText = '';
                        let lastUsedKanjiIndex = 0;
                        if (nonKanji.length === 0) {
                            return this.#replacementTemplate.replace('$1', wordText).replace('$2', furiganaText);
                        }

                        nonKanji.forEach((currentNonKanji, index) => {
                            if (furiganaText === undefined) {
                                if (index < kanji.length) {
                                    replacementText += kanji[index];
                                }

                                replacementText += currentNonKanji;
                                return;
                            }
                            let splitFurigana = furiganaText.split(new RegExp(escapeForRegex(currentNonKanji) + '(.*)')).filter(this.#emptyStringFilter);

                            lastUsedKanjiIndex = index;
                            replacementText += this.#replacementTemplate.replace('$1', kanji[index]).replace('$2', splitFurigana[0]);
                            replacementText += currentNonKanji;

                            furiganaText = splitFurigana[1];
                        });
                        if (furiganaText !== undefined && lastUsedKanjiIndex + 1 < kanji.length) {
                            replacementText += this.#replacementTemplate.replace('$1', kanji[lastUsedKanjiIndex + 1]).replace('$2', furiganaText);
                        } else if (furiganaText !== undefined) {
                            return this.#replacementTemplate.replace('$1', wordText).replace('$2', originalFuriganaText);
                        } else if (lastUsedKanjiIndex + 1 < kanji.length) {
                            replacementText += kanji[lastUsedKanjiIndex + 1];
                        }
                        return replacementText;
                    }
                } else {
                    return match;
                }
            });
        });

        if (!options.furiganaStrictMode) {
            if (options.furiganaAutoBracketSets !== this.#previousAutoBracketSets) {
                this.#updateAutoRegexList(options.furiganaAutoBracketSets);
            }
            this.#autoRegexList.forEach(regex => {
                text = text.replace(regex, (match, preWordTerminator, wordKanji, wordKanaSuffix, furiganaText, offset, mainText) => {
                    offset
                    mainText
                    if (match.indexOf('\\') === -1) {
                        if (options.furiganaPatternMatching) {
                            let rubies = [];

                            let furigana = furiganaText;

                            let stem = (' ' + wordKanaSuffix).slice(1);
                            for (let i = furiganaText.length - 1; i >= 0; i--) {
                                if (wordKanaSuffix.length === 0) {
                                    furigana = furiganaText.substring(0, i + 1);
                                    break;
                                }
                                if (furiganaText[i] !== wordKanaSuffix.slice(-1)) {
                                    furigana = furiganaText.substring(0, i + 1);
                                    break;
                                }
                                wordKanaSuffix = wordKanaSuffix.slice(0, -1);
                            }

                            if (RubyRender.#furiganaSeperators.split('').reduce(
                                (noSeperator, seperator) => {
                                    return noSeperator && (furigana.indexOf(seperator) === -1);
                                },
                                true
                            )) {
                                rubies = [this.#replacementTemplate.replace('$1', wordKanji).replace('$2', furigana)];
                            } else {
                                let kanaParts = furigana.split(RubyRender.#seperatorRegex);
                                let kanji = wordKanji.split('');
                                if (kanaParts.length === 0 || kanaParts.length > kanji.length) {
                                    rubies = [this.#replacementTemplate.replace('$1', wordKanji).replace('$2', furigana)];
                                } else {
                                    for (let i = 0; i < kanaParts.length - 1; i++) {
                                        if (kanji.length === 0) {
                                            break;
                                        }
                                        rubies.push(this.#replacementTemplate.replace('$1', kanji.shift()).replace('$2', kanaParts[i]));
                                    }
                                    let lastKanaPart = kanaParts.pop();
                                    rubies.push(this.#replacementTemplate.replace('$1', kanji.join('')).replace('$2', lastKanaPart));
                                }
                            }

                            return preWordTerminator + rubies.join('') + stem;
                        } else {
                            return preWordTerminator + this.#replacementTemplate.replace('$1', wordKanji).replace('$2', furiganaText) + wordKanaSuffix;
                        }
                    } else {
                        return match;
                    }
                });
            });
        }
        return text;
    }

    #handleEscapedSpecialBrackets(text) {
        // By default 【 and 】 cannot be escaped in markdown, this will remove backslashes from in front of them to give that effect.
        return text.replace(/\\([【】])/g, '$1');
    }

    render(text, options) {
        return this.#handleEscapedSpecialBrackets(this.#addText(text, options || RubyRender.DEFAULT_OPTIONS));
    }

    registerMarked(render) {
        let that = this;
        render.text = function (text) {
            return that.render(text)
        }
    }

    registerMarkit(helper){
        if (helper.markdownIt) { return; }
        helper.whiteList([
            'ruby',
            'rt',
            'rp'
        ]);

        helper.addPreProcessor(text => {
            return this.render(text, helper.getOptions());
        });
    }
}

let RubyRener = new RubyRender()
export default RubyRener