#!/usr/bin/env node
import { printTable, DoubleOutlineTableStyle } from "../src/index.js";

const color = !!process.stdout.isTTY;

printTable([
    ['Note 1:', 'The displayed character width depends on your terminal and on the used font.\n'+
              'Therefore the widths of non-latin 1 characters are pretty much guessed.\n' +
              'E.g. newer emojis might be rendered incorrectly and thus their widths may be guessed wrongly.'],
    [],
    ['Note 2:', 'Tabs are currently just replaced with 4 spaces.\n'+
                'This might change in the future to more correct tabstop handling.'],
    [],
    ['Emojis', '😅⛪🗻🦝🍓🌧️🌜🌟🚣🥇🎬🌇🛅🚀⏱️⛱️⏳🚰💔💯🔔⚠️⬆️🔙⏏️🈹☃️'],
    ['Japanese', '後ケリニ氏会チクムニ燃介今到ざ組理ウネ'],
    ['Half-Width', '｡｢｣､･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ'],
    ['Full-Width Latin', '＠ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ'],
    ['Full-Width Numbers', '０１２３４５６７８９'],
    ['Chinese', '美節以養隨如就打管身通，意吃說去第具漸：金先有受兩！'],
    ['Hindi', 'विभाग भारतीय हुएआदि ७हल सकते विकास खयालात वास्तव आंतरकार्यक्षमता संसाध'],
    ['Georgian', 'ლორემ იფსუმ დოლორ სით ამეთ'],
    ['Korean', '모든 국민은 자기의 행위가 아닌 친족의 행위로 인하여 불이익한 처우를 받지 아니한다.'],
    ['Arabic', 'أن بحق بحشد مكثّفة المشترك, بـ يكن مسرح اليابان الولايات.'],
    ['Hebrew', 'למנוע טיפול הספרות אנא את. קבלו מוסיקה קישורים בקר בה, ב והוא לטיפול ארץ.'],
    ['Latin NFKC', 'ÖÄÜöäüßẞ'],
    ['Latin NFKD', 'ÖÄÜöäüßẞ'],
    ['Control Characters', '\0 \r \v \f \u001b \x7f Tab: "\t"'],
], {
    color,
    style: DoubleOutlineTableStyle
});
