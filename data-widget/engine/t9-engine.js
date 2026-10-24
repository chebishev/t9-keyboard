import { getText } from '@zos/i18n';

export const BASE_LANG = getText("baseLanguage")
const T9_MAP_K = ['2', '3', '4', '5', '6', '7', '8', '9'];

const EN_T9_MAP_V = [
    'abc', 'def', 'ghi', 'jkl',
    'mno', 'pqrs', 'tuv', 'wxyz',
];

// TO BE CHANGED FOR OTHER LANGUAGES!!!
const NATIVE_T9_MAP_V = [
    'αάβγ', 'δεέζ', 'ηήθιί', 'κλμ',
    'νξοό', 'πρσς', 'τυύφ', 'χψωώ',
];

function l2dMap(mapKeys, mapValues) {
    const currentMap = {};

    for (let i = 0; i < mapKeys.length; i++) {
        const digit = mapKeys[i];
        const letters = mapValues[i];

        for (let j = 0; j < letters.length; j++) {
            currentMap[letters[j]] = digit;
        }
    }

    return currentMap;
}

// create l2d maps
const EN_L2D_MAP = l2dMap(T9_MAP_K, EN_T9_MAP_V);
const NATIVE_L2D_MAP = l2dMap(T9_MAP_K, NATIVE_T9_MAP_V);

export class T9Engine {
    constructor(dict, language) {
        this.dictionary = dict;
        this.language = language;
        this.l2d_map = language === BASE_LANG ? NATIVE_L2D_MAP : EN_L2D_MAP;
        this.seq_cache = new Map();
        this.seq_map = new Map();
        this.prefix_idx = new Map();
        this.pending_arr = [];
        this.is_processing = false;
        this.cur_seq = null;
        this.cancel_flag = false;
        this.is_ready = false;
        this.ready_callbs_arr = [];
    }

    init() {
        if (this.is_ready) return Promise.resolve();
        if (this.init_promise) return this.init_promise;

        this.init_promise = new Promise((resolve) => {
            setTimeout(() => {
                this.buildSeqMap();
                this.is_ready = true;

                while (this.ready_callbs_arr.length > 0) {
                    this.ready_callbs_arr.shift()();
                }

                resolve();
            }, 0);
        });
        return this.init_promise;
    }

    buildSeqMap() {
        const dict = this.dictionary;
        const dict_len = dict.length;

        // build seq_map
        for (let i = 0; i < dict_len; i++) {
            const word = dict[i];
            const seq = this.wordToSeq(word);
            let words_arr = this.seq_map.get(seq);
            if (!words_arr) {
                words_arr = [];
                this.seq_map.set(seq, words_arr);
            }
            words_arr.push(word);
        }

        // Sort words by length and then alphabetically.
        for (const words_arr of this.seq_map.values()) {
            words_arr.sort((a, b) => {
                const len_diff = a.length - b.length;
                if (len_diff !== 0) return len_diff;
                return a < b ? -1 : a > b ? 1 : 0;
            });
        }

        // build prefix index
        for (const [seq, _] of this.seq_map) {
            const seq_len = seq.length;
            for (let i = 1; i <= seq_len; i++) {
                const prefix = seq.substring(0, i);
                let prefix_arr = this.prefix_idx.get(prefix);
                if (!prefix_arr) {
                    prefix_arr = [];
                    this.prefix_idx.set(prefix, prefix_arr);
                }
                prefix_arr.push(seq);
            }
        }
    }

    wordToSeq(word) {
        let result = '';

        for (let i = 0; i < word.length; i++) {
            let char = word[i].toLowerCase();
            const digit = this.l2d_map[char];
            
            if (digit) result += digit;
        }

        return result;
    }

    getSuggestions(seq, max_results, callback) {
        if (!this.is_ready) {
            this.ready_callbs_arr.push(() => {
                this.getSuggestions(seq, max_results, callback);
            });
            return;
        }

        if (this.cur_seq !== seq) {
            this.pending_arr = [];
            this.cur_seq = seq;
            this.cancel_flag = true;
        }

        const request = {
            seq,
            max_results,
            callback,
        };

        this.pending_arr.push(request);
        if (!this.is_processing) {
            this.processNext();
        }
    }

    processNext() {
        const pending_len = this.pending_arr.length;
        if (pending_len === 0) {
            this.is_processing = false;
            return;
        }

        this.is_processing = true;
        this.cancel_flag = false;
        const latest = this.pending_arr[pending_len - 1];
        this.pending_arr = [];

        this.getSuggestionsChunked(
            latest.seq,
            latest.max_results,
            (suggestions) => {
                if (!this.cancel_flag) {
                    latest.callback(suggestions);
                }
                this.processNext();
            }
        );
    }

    getSuggestionsChunked(seq, max_results, callback) {
        if (!seq) {
            callback([]);
            return;
        }

        const cache_key = `${seq}_${max_results}`;

        if (this.seq_cache.has(cache_key)) {
            const cached = this.seq_cache.get(cache_key);
            callback(cached);
            return;
        }

        const suggestions_arr = [];
        const exact_matches = this.seq_map.get(seq);

        if (exact_matches) {
            const exact_len = exact_matches.length;
            for (let i = 0; i < exact_len && suggestions_arr.length < max_results; i++) {
                suggestions_arr.push(exact_matches[i]);
            }
        }

        if (suggestions_arr.length >= max_results) {
            this.seq_cache.set(cache_key, suggestions_arr);
            callback(suggestions_arr);
            return;
        }

        const matching_seqs_arr = this.prefix_idx.get(seq) || [];
        const chunk_size = 20;
        let chunk_idx = 0;

        const processChunk = () => {
            if (this.cancel_flag) {
                callback([]);
                return;
            }

            const start = chunk_idx * chunk_size;
            const matching_len = matching_seqs_arr.length;
            const end = start + chunk_size < matching_len ? start + chunk_size : matching_len;
            let found_in_chunk = false;

            for (let i = start; i < end && suggestions_arr.length < max_results; i++) {
                const longer_seq = matching_seqs_arr[i];
                const seq_len = seq.length;
                if (longer_seq.length > seq_len) {
                    const words_arr = this.seq_map.get(longer_seq);
                    if (words_arr) {
                        const words_len = words_arr.length;
                        for (let j = 0; j < words_len && suggestions_arr.length < max_results; j++) {
                            const word = words_arr[j];

                            let already_exists = false;
                            const sugg_len = suggestions_arr.length;
                            for (let k = 0; k < sugg_len; k++) {
                                if (suggestions_arr[k] === word) {
                                    already_exists = true;
                                    break;
                                }
                            }
                            if (!already_exists) {
                                suggestions_arr.push(word);
                                found_in_chunk = true;
                            }
                        }
                    }
                }
            }

            chunk_idx++;

            if (suggestions_arr.length >= max_results || chunk_idx * chunk_size >= matching_len) {
                this.seq_cache.set(cache_key, suggestions_arr);
                callback(suggestions_arr);
                return;
            }

            if (!found_in_chunk && chunk_idx > 5) {
                this.seq_cache.set(cache_key, suggestions_arr);
                callback(suggestions_arr);
                return;
            }

            setTimeout(processChunk, 0);
        };

        setTimeout(processChunk, 0);
    }
}