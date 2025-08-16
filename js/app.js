// ===== 0) 책 이름 매핑(표준책이름 ← 다양한 별칭) =====
const BOOK_ALIASES = (() => {
  const map = new Map();
  const norm = s => s.toLowerCase().replace(/\s+/g,'');
  const add = (canon, aliases=[]) => { map.set(norm(canon), canon); aliases.forEach(a => map.set(norm(a), canon)); };

  // 구약
  add('창세기',['창','창세','gen','genesis']);
  add('출애굽기',['출','출애굽','exo','exodus']);
  add('레위기',['레','lev','leviticus']);
  add('민수기',['민','num','numbers']);
  add('신명기',['신','deut','deuteronomy']);
  add('여호수아',['수','jos','joshua']);
  add('사사기',['삿','judg','judges']);
  add('룻기',['룻','rut','ruth']);
  add('사무엘상',['삼상','1sam','1sa']);
  add('사무엘하',['삼하','2sam','2sa']);
  add('열왕기상',['왕상','1ki','1kgs']);
  add('열왕기하',['왕하','2ki','2kgs']);
  add('역대상',['대상','1ch','1chr']);
  add('역대하',['대하','2ch','2chr']);
  add('에스라',['스','ezr','ezra']);
  add('느헤미야',['느','neh','nehemiah']);
  add('에스더',['에','est','esther']);
  add('욥기',['욥','job']);
  add('시편',['시','ps','psalm','psalms']);
  add('잠언',['잠','pr','prov','proverbs']);
  add('전도서',['전','eccl','ecclesiastes','qohelet']);
  add('아가',['아','song','songofsolomon','songs']);
  add('이사야',['사','isa','isaiah']);
  add('예레미야',['렘','jer','jeremiah']);
  add('예레미야애가',['애','lam','lamentations']);
  add('에스겔',['겔','ezk','ezekiel']);
  add('다니엘',['단','dan','daniel']);
  add('호세아',['호','hos','hosea']);
  add('요엘',['욜','joel','jl']);
  add('아모스',['암','amos','am']);
  add('오바댜',['옵','obadiah','ob']);
  add('요나',['욘','jonah','jon']);
  add('미가',['미','micah','mic']);
  add('나훔',['나','nahum','nah']);
  add('하박국',['합','habakkuk','hab']);
  add('스바냐',['습','zephaniah','zep']);
  add('학개',['학','haggai','hag']);
  add('스가랴',['슥','zechariah','zec']);
  add('말라기',['말','malachi','mal']);
  // 신약
  add('마태복음',['마','마태','matt','mt','matthew']);
  add('마가복음',['막','마가','mk','mrk','mark']);
  add('누가복음',['눅','누가','lk','luke']);
  add('요한복음',['요','요한','jn','john']);
  add('사도행전',['행','acts','ac']);
  add('로마서',['롬','rom','romans']);
  add('고린도전서',['고전','1co','1cor']);
  add('고린도후서',['고후','2co','2cor']);
  add('갈라디아서',['갈','gal','galatians']);
  add('에베소서',['엡','eph','ephesians']);
  add('빌립보서',['빌','php','philippians']);
  add('골로새서',['골','col','colossians']);
  add('데살로니가전서',['살전','1th','1thess']);
  add('데살로니가후서',['살후','2th','2thess']);
  add('디모데전서',['딤전','1ti','1tim']);
  add('디모데후서',['딤후','2ti','2tim']);
  add('디도서',['딛','tit','titus']);
  add('빌레몬서',['몬','phm','philemon']);
  add('히브리서',['히','heb','hebrews']);
  add('야고보서',['약','jas','james']);
  add('베드로전서',['벧전','1pe','1pet']);
  add('베드로후서',['벧후','2pe','2pet']);
  add('요한일서',['요일','1jn','1john']);
  add('요한이서',['요이','2jn','2john']);
  add('요한삼서',['요삼','3jn','3john']);
  add('유다서',['유','jud','jude']);
  add('요한계시록',['계','계시록','rev','revelation']);
  return { resolve: s => s ? (map.get(norm(s)) || null) : null };
})();

// ===== 1) 입력 파서 (책 생략시 직전 책 기억) =====
let lastBook = null;
function parseReference(raw){
  if(!raw || !raw.trim()) throw new Error('입력이 비어 있습니다.');
  const s = raw.trim().replace(/[–—－~]/g,'~').replace(/-/g,'~');
  const re = /^(?:(?<book>[^\d:~]+?)\s+)?(?<c1>\d+):(?<v1>\d+)(?:\s*~\s*(?:(?<c2>\d+):)?(?<v2>\d+))?$/;
  const m = s.match(re);
  if(!m) throw new Error('형식을 인식하지 못했습니다. 예) "요 3:16~18", "요 3:16~4:2"');

  const bookInput = m.groups.book?.trim();
  let book = bookInput ? BOOK_ALIASES.resolve(bookInput) : (lastBook || null);
  if(!book) throw new Error('책 이름이 없습니다. 처음 한 번은 "요한복음 3:16"처럼 책 포함 입력이 필요합니다.');
  lastBook = book;

  const c1 = parseInt(m.groups.c1,10);
  const v1 = parseInt(m.groups.v1,10);
  const hasRange = m.groups.v2 != null;
  const c2 = hasRange && m.groups.c2 ? parseInt(m.groups.c2,10) : c1;
  const v2 = hasRange ? parseInt(m.groups.v2,10) : v1;

  return { book, start:{c:c1,v:v1}, end:{c:c2,v:v2} };
}

// ===== 2) /개역개정/{책}.txt 로더 (장:절  공백/탭  본문) =====
const cache = new Map();
// 기존:
// const url = `./개역개정/${encodeURIComponent(bookName)}.txt`;

async function loadBookText(bookName){
  if(cache.has(bookName)) return cache.get(bookName);

  // 폴더와 파일명 모두 안전 인코딩
  const folder = encodeURIComponent('bible_1');
  const file   = encodeURIComponent(bookName) + '.txt';
  const url    = `./${folder}/${file}`;

  // 상태 표시(디버깅에도 도움)
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = `불러오는 중: ${decodeURIComponent(url)}`;

  const res = await fetch(url);
  if(!res.ok){
    // 404 등일 때 즉시 이유 보여주기
    throw new Error(`데이터 불러오기 실패(HTTP ${res.status}) · 경로 확인: ${decodeURIComponent(url)}`);
  }
  const text = await res.text(); // 파일은 UTF-8이어야 함

  const chapters = {};
  text.split(/\r?\n/).forEach(line => {
    const s = line.trim();
    if(!s) return;
    const m = s.match(/^(\d+):(\d+)\s+(.*)$/);
    if(!m) return;
    const ch = m[1], vs = m[2], body = m[3];
    (chapters[ch] ||= {})[vs] = body;
  });

  cache.set(bookName, chapters);
  return chapters;
}


function createAccessors(book){
  const maxVerse = ch => {
    const vs = book[ch]; if(!vs) return 0;
    return Math.max(...Object.keys(vs).map(Number));
  };
  const getVerse = (ch,v) => book?.[ch]?.[v] ?? null;
  return { maxVerse, getVerse };
}

function expandRange(range, getMaxVerse){
  const out = [];
  const { start, end } = range;
  if(end.c < start.c || (end.c===start.c && end.v < start.v))
    throw new Error('끝절이 시작절보다 앞설 수 없습니다.');
  for(let c=start.c; c<=end.c; c++){
    const vStart = (c===start.c)? start.v : 1;
    const vEnd   = (c===end.c)? end.v : getMaxVerse(String(c));
    for(let v=vStart; v<=vEnd; v++) out.push({c,v});
  }
  return out;
}

// ===== 3) 복사본 생성 (줄 포맷: "책 장:절  본문") =====
function buildClipboardText(book, points, getVerse){
  const lines = [];
  for (const p of points) {
    const body = getVerse(String(p.c), String(p.v));
    if (!body) continue;
    // ✅ 장:절/책이름 제거 → 본문만
    lines.push(String(body).trim());
  }
  // 여러 줄 본문을 그대로 복사
  return lines.join('\n');
}

// ===== 4) 클립보드 복사 (Clipboard API + 폴백) =====
async function copyToClipboard(text){
  // 최신 Clipboard API
  if(navigator.clipboard && window.isSecureContext){
    await navigator.clipboard.writeText(text);
    return true;
  }
  // 폴백: 임시 textarea + execCommand
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}

// ===== 5) UI 바인딩 =====
const el = {
  form   : document.getElementById('refForm'),
  input  : document.getElementById('refInput'),
  preview: document.getElementById('preview'),
  status : document.getElementById('status'),
};

el.form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  el.status.textContent = '처리 중...';
  el.status.className = 'muted';

  try{
    const parsed = parseReference(el.input.value);
    const bookData = await loadBookText(parsed.book);
    const { maxVerse, getVerse } = createAccessors(bookData);
    const points = expandRange(parsed, c => maxVerse(String(c)));

    if(points.length===0) throw new Error('해당 범위에 구절이 없습니다.');

    const text = buildClipboardText(parsed.book, points, getVerse);
    el.preview.textContent = text || '(미리보기 없음)';

    const ok = await copyToClipboard(text);
    if(ok){
      el.status.innerHTML = '<span class="ok">클립보드에 복사되었습니다.</span>';
    }else{
      el.status.innerHTML = '<span class="err">복사에 실패했습니다. 브라우저 권한을 확인하세요.</span>';
    }
  }catch(err){
    el.status.innerHTML = `<span class="err">오류: ${err.message}</span>`;
  }
});

// Enter 키는 form submit으로 자동 처리




