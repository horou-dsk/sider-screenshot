import pinyin from "pinyin";
import type { QuickSearchApp } from "../types";

type Match = {
	item: QuickSearchApp;
	matchIndex: { start: number; end: number }[];
	matchText: string;
};

export function filterMatchs(apps: QuickSearchApp[], text: string): Match[] {
	const abbrs = text.split("");
	if (!text) {
		return [];
	}
	const matchs = [];
	const now = Date.now();
	for (const d of apps) {
		const name = d.name.toLowerCase();
		const indexOf = name.indexOf(text);
		if (indexOf > -1) {
			matchs.push({
				item: d,
				matchIndex: [{ start: indexOf, end: indexOf + text.length }],
				matchText: text,
			});
			continue;
		}
		const nameWords = name.split(" ");
		// if (nameWords.join("").includes(text)) {
		//   matchs.push({item: d});
		//   continue;
		// }
		let matchIndexes: { start: number; end: number }[] = [];
		let start = 0;
		let match = abbrs.every((abbr, index) => {
			const word = nameWords[index];
			const isMatch = word?.startsWith(abbr);
			if (isMatch) {
				matchIndexes.push({
					start: start,
					end: start + abbr.length,
				});
			}
			start += (word?.length ?? 0) + 1;
			return isMatch;
		});
		if (match) {
			matchs.push({ item: d, matchIndex: matchIndexes, matchText: text });
			continue;
		}
		if (!/[^\x00-\x7F]/.test(name)) {
			continue;
		}
		const pinyinArr = pinyin(name, { style: "normal", heteronym: true });
		const positions = processString(name, pinyinArr);
		let matchIndex = 0;
		matchIndexes = [];
		out: for (let i = 0; i < pinyinArr.length; i++) {
			const abbr = abbrs[matchIndex];
			if (!abbr) {
				break;
			}
			const words = pinyinArr[i];
			for (const word of words) {
				if (word.startsWith(abbr)) {
					match = true;
					matchIndex++;
					// 记录匹配的索引
					const pos = positions[i];
					matchIndexes.push({
						start: pos.start,
						end: pos.length + pos.start,
					});
					// 判断后续的文本是否匹配，如果不匹配，就全都不匹配
					if (i === pinyinArr.length - 1 && matchIndex < abbrs.length) {
						match = false;
					}
					continue out;
				}
			}
			if (match) {
				match = false;
				break;
			}
		}
		if (match) {
			matchs.push({ item: d, matchIndex: matchIndexes, matchText: text });
			continue;
		}
		matchIndex = 0;
		matchIndexes = [];
		for (let i = 0; i < pinyinArr.length; i++) {
			const p = pinyinArr[i];
			const sw = text.substring(matchIndex);
			if (!sw) {
				break;
			}
			for (const word of p) {
				if (sw.startsWith(word) || word.startsWith(sw)) {
					matchIndex += word.length;
					match = true;
					const pos = positions[i];
					matchIndexes.push({
						start: pos.start,
						end: pos.length + pos.start,
					});
					break;
				}
				match = false;
			}
		}
		if (matchIndex < text.length) {
			match = false;
		}
		if (match) {
			matchs.push({ item: d, matchIndex: matchIndexes, matchText: text });
		}
	}
	console.log("耗时：", Date.now() - now);
	return matchs;
}

function processString(s: string, pinyin: string[][]) {
	// 使用正则表达式匹配所有的非中文单词
	const nonChineseWordRegex = /([a-zA-Z0-9_\s\(\)]+)/g;
	let match: RegExpExecArray | null;
	const positions: Array<{ start: number; length: number }> = [];
	const nonChineseWords: string[] = [];

	while ((match = nonChineseWordRegex.exec(s)) !== null) {
		positions.push({ start: match.index, length: match[0].length });
		nonChineseWords.push(match[0]);
	}
	let nindex = 0;
	const pos = [];
	let end = 0;
	for (let i = 0; i < pinyin.length; i++) {
		const v = pinyin[i];
		const n = nonChineseWords[nindex];
		const npos = positions[nindex];
		// console.log(npos, v[0]);
		if (n?.includes(v[0])) {
			pos.push({
				text: n,
				start: end,
				length: npos.length,
			});
			end += npos.length;
			nindex += 1;
		} else {
			pos.push({
				text: s[end],
				start: end,
				length: 1,
			});
			end += 1;
		}
	}
	return pos;
}
