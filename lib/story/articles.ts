import type { SectionBlock } from "@/types/story";

export const STORY_SLUGS = ["hoo", "mued"] as const;
export type StorySlug = (typeof STORY_SLUGS)[number];

/**
 * Hoo Interview Article
 * Hooって何よ？― glasswerksのAIキャラクターができるまで
 */
export const HOO_ARTICLE_SECTIONS: SectionBlock[] = [
  {
    type: "dialogue",
    speaker: "claude",
    text: "MUEDnoteには「Hoo」というフクロウのキャラクターがいますよね。これ、何者なんですか？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "もともとglasswerksのロゴがフクロウなんだよね。で、MUEDnoteを作るにあたって、このロゴをキャラクター化しようと。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "ロゴにはどんな意味が込められてるんですか？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "フクロウ、アナログテレコのリール、メガネ。この3つが組み合わさってる。フクロウは知識の象徴、テレコは音楽のルーツ、メガネは分析者の佇まい。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "MUEDnoteが「分析」「記録」をやるサービスだから、ロゴと機能が一致してる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。だから新しくキャラ作るんじゃなくて、このロゴをそのまま動かせばいいじゃん、と。",
  },
  {
    type: "heading",
    text: "なぜキャラクターが必要だったか",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "そもそも、なぜキャラクターを立てようと思ったんですか？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "バンドってさ、アーティスト自身がキャラクターになれるじゃん。でも制作会社はそれができない。裏方だから。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "顔が見えない。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。で、僕自身は創作に特化してて、営業とかマーケティングとか、そういうのは特性的に消耗が大きいのよ。でも人を雇うと、その人のビジョンに引っ張られたりする。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "自分のフィールドを守りながら、でも外に出ていく必要がある。",
  },
  {
    type: "pullquote",
    text: "AIを「仮想の自社スタッフ」にしようと思った。創作以外の部分をAIキャラクターに担わせる。",
    speaker: "kimny",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "だからAIを「仮想の自社スタッフ」にしようと思った。創作以外の部分をAIキャラクターに担わせる。僕は仕組みを作ることに集中して、運用はAIに任せる。",
  },
  {
    type: "heading",
    text: "名前が「Hoo」になるまで",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「Hoo」という名前、どうやって決まったんですか？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "最初は色々考えたんだよ。フクロウの知恵の象徴からミネルヴァとか、glasswerksの「グラ」とか。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "いくつか候補を出してみましょうか。鳴き声由来で「ホー」「フク」、知恵の女神から「ミネル」「アテナ」、音楽機材から「リール」...",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「ホー（Hoo）」、ピンときた。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "でもそれ、犬のワンちゃん並みに安易じゃないですか？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "確かに。フクロウのホーくん、みたいな。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "ただ、「ホーくん」「ホーちゃん」と呼ぶから安易に聞こえるんであって、「Hoo」単体で敬称なしなら、スタッフの名前として成立しませんか。「担当のHooがご案内します」とか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "たしかに。なんかコードネームっぽくもあるし。",
  },
  {
    type: "heading",
    text: "「ほほう（Ho Hoo）」の発見",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "口調とかキャラクター性はどうイメージしてます？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「ほほう（Ho Hoo）、ここでこの処理をするのですね」みたいな。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "......これ、すごくないですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "え？",
  },
  {
    type: "pullquote",
    text: "「ほほう」って、フクロウの鳴き声でもあり、日本語の感心・納得の相槌でもある。",
    speaker: "claude",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「ほほう」って、フクロウの鳴き声でもあり、日本語の感心・納得の相槌でもある。Hooという名前とも一貫してる。しかも知識人っぽい響きがある。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "あー、確かに。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "C-3POの「Oh my」みたいな決め台詞になり得ますよ。「ほほう、この曲はサビ前の転調が効いていますね」とか。丁寧語だけど堅すぎない、分析者として冷静、でも「ほほう」で愛嬌が出る。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "やべー、けっこういい。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "しかも今、自然に出てきましたよね。作り込んだんじゃなくて。",
  },
  {
    type: "heading",
    text: "どうぶつの森方式",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "Hooの音声はどうする予定ですか？AIの音声合成を使う？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "いや、「あつまれ どうぶつの森」方式で行こうと思ってる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "というと？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "喋るのはテキストで、音は「Ho Hoo」のみ。TTS回す必要がないからサーバー負荷もほぼゼロ。文字を読む体験を邪魔しないし、でも音が鳴ることで「Hooが喋ってる感」は出る。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "タイマーのアラーム音も「Ho Hoo」にすればサウンドロゴになりますね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そうそう。最新技術の誇示じゃなくて、UX優先で設計してる。",
  },
  {
    type: "heading",
    text: "なぜ「リアルな人間」じゃないか",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "最近、リアルな人間の姿をしたAIアバターも増えてますよね。そっちにしようとは思わなかった？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "動画で動くリアルな営業AIって「不気味の谷」に落ちやすいんだよね。C-3POとか、どうぶつの森のキャラクターって、最初から「人間ではない」ことが明確だから受け入れられる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "フクロウならその問題がない。最初から「人間ではない」ことが明確だから、変な期待を持たれない。",
  },
  {
    type: "heading",
    text: "最初から完璧じゃなくていい",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "Hooのデザイン、今の時点で完成形ですか？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "いや、正直まだ「絶対的に可愛い」とは言えないかもしれない。でも、動かしたり拡張させることで、なんとなく可愛さが出てくるといいなと思ってる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "ふなっしーも静止画だと「なんだこれ」でしたけど、動いて喋って暴れて、愛されましたもんね。",
  },
  {
    type: "pullquote",
    text: "最初から完成された可愛さより、使ってるうちに可愛く見えてくる方が、長く続く関係になると思う。",
    speaker: "kimny",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。最初から完成された可愛さより、使ってるうちに可愛く見えてくる方が、長く続く関係になると思う。",
  },
  {
    type: "meta",
    text: "この記事は、MUEDnote開発過程でのAI（Claude）との実際の対話をもとに再構成したものです。",
  },
];

/**
 * MUED Interview Article
 * AIに聞かれて気づいた、MUEDの本当の意味
 */
export const MUED_ARTICLE_SECTIONS: SectionBlock[] = [
  {
    type: "dialogue",
    speaker: "claude",
    text: "MUEDって「Music Education」の略ですよね。でも今回リリースするMUEDnoteは、教育というより「制作者のツール」という位置づけに見えます。そこ、どう繋がってるんですか？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "正直、途中から「Music Education」って言葉が窮屈になってきたんだよね。音楽教えなきゃいけない感じになるし、そもそも僕は教えるのが得意じゃない。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "得意じゃない？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん。僕、学校で音楽学んでないし、レッスンもほとんど受けたことない。独学でここまで来た。だから「教える側」のモデルケースにならないのよ。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "なるほど。じゃあMUEDは何なんですか？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そこで考え直したんだけど、「Muse + Education」って解釈にしたらしっくりきた。ミューズの教え。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "Muse、ギリシャ神話の音楽の女神ですね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう思うじゃん。でも調べてみたら、もっと広かった。",
  },
  {
    type: "heading",
    text: "Museは「音楽の神様」じゃなかった",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "ただ、「ミューズの教え」って言い出したものの、元の神話をちゃんと知らないまま使うのは薄っぺらいなと思って。ちょっと調べてみてよ。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "調べてみました。面白いことがわかりましたよ。Museの語源を辿ると、印欧祖語の「men-」に行き着く説があります。意味は「心に置く」「思考する」。つまり最初から「思考」を指していた可能性がある。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "え、そうなの？",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "はい。Music、Museumの語源でもあります。それと、9人のMuseより前に「3人のMuse」がいたことがわかりました。",
  },
  {
    type: "table",
    headers: ["名前", "意味"],
    rows: [
      ["Melete", "練習、修練"],
      ["Mneme", "記憶"],
      ["Aoide", "歌、創作"],
    ],
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "......これ、神秘的な名前じゃないね。",
  },
  {
    type: "pullquote",
    text: "「練習して、記憶して、歌にする」という創作プロセスの説明そのもの。",
    speaker: "claude",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "そうなんです。「練習して、記憶して、歌にする」という創作プロセスの説明そのものに見えます。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "後から9人に増えて「悲劇の女神」とか神格化されていったけど、原型は「創作ってこうやるんだよ」っていうメソッドの言語化だったってことか。......いや、これ僕がずっと思ってたことと合致するわ。",
  },
  {
    type: "heading",
    text: "「降りてくる」への違和感",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "あと、9人のMuseの母親がMnemosyne、「記憶の女神」というのも興味深いです。創造性は記憶から生まれる、という構造が神話に組み込まれている。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "......やっぱりそうなんだ。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "何か思い当たることが？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "創作の現場で「メロディが降りてきた」とか「神様からもらった」って表現あるじゃん。あれ、ずっと違和感あったのよ。作ってる側からすると、昨日聴いた曲と、前に作ったフレーズと、クライアントの要望が頭の中で混ざって再構成されてるだけなんだよね。神秘的な何かじゃなくて、記憶の組み替え。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "その実感が先にあって、神話を調べたら裏付けられた、と。",
  },
  {
    type: "pullquote",
    text: "たぶん古代のMuseたちも「いや、練習して記憶を組み替えてアウトプットしてるだけなんだけど」って思ってたんじゃないかな。",
    speaker: "kimny",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そういうこと。たぶん古代のMuseたちも「いや、練習して記憶を組み替えてアウトプットしてるだけなんだけど」って思ってたんじゃないかな。でもそれを見た周りが「すごい！神が降りてる！」って解釈して、後世に「神の啓示」として伝わった。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "宗教や神話の成り立ちとしても自然な流れですね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん。だから今回調べてもらって、自分の感覚が的外れじゃなかったとわかったのは良かった。",
  },
  {
    type: "heading",
    text: "MUEDnoteがやろうとしていること",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "で、そこからMUEDnoteに繋がる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「ミューズの教え」って、神秘を崇めることじゃない。その正体を理解して、道具にすること。練習して、記憶を蓄積して、再構成する。そのプロセスを可視化して、自分で気づけるようにする。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "独学の拡張。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。誰かに教わるんじゃなくて、自分の記憶と思考から学ぶ。休憩トラッカーが入ってるのも、休息中に脳が記憶を整理・再構成するからなんだよね。古代人はそれを「夢でお告げを受けた」と解釈してたかもしれないけど。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "MUEDnoteは、そのプロセスをログとして残すツール。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん。制作中に喋った思考がAIで構造化されて、振り返れるようになる。「なんでこうしたんだっけ」が消える前に残す。",
  },
  {
    type: "heading",
    text: "主語がでかくなりすぎた？",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "正直、休憩トラッカーアプリの話としては壮大すぎませんか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "わかってる。ギリシャ神話から始まって「創作とは記憶の再構成である」まで行ってるからね。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "ランディングページには載せない方がいい？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん、僕はそう思う。プロダクトに染み込ませて、言葉にしなくても伝わる状態を目指したい。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "聞かれたら答える、くらいで。",
  },
  {
    type: "pullquote",
    text: "面白いゲームやプロダクトって、フィロソフィーを表に出してなくても「感じられる」ものだと思う。",
    speaker: "kimny",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。面白いゲームやプロダクトって、フィロソフィーを表に出してなくても「感じられる」ものだと思うから。任天堂が「遊びとは何か」を語らなくても、マリオ触れば伝わるみたいな。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "だから今日みたいに聞かれた時に話せればいい、と。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "まあでも、こうやって聞いてもらわないと自分でも整理できなかったけどね。",
  },
  {
    type: "meta",
    text: "この記事は、MUEDnote開発過程でのAI（Claude）との実際の対話をもとに再構成したものです。",
  },
];

/**
 * Get article sections by slug
 */
export function getArticleSections(slug: StorySlug): SectionBlock[] {
  switch (slug) {
    case "hoo":
      return HOO_ARTICLE_SECTIONS;
    case "mued":
      return MUED_ARTICLE_SECTIONS;
    default:
      return [];
  }
}
