import type { SectionBlock } from "@/types/story";

export const STORY_SLUGS = ["hoo", "mued", "muedear"] as const;
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
    text: "ランディングページの前面には載せない方がいい？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そうだね。ファーストビューで「ムネモシュネが〜」とか言われても困るでしょ。でもここまで読んでくれてる人には届いてもいいと思う。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "深いところまで読む人には、むしろ響く。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん。プロダクトの表面は機能で語って、哲学は使ってるうちに伝わればいい。でもこうやって聞いてくれる人には、ちゃんと答えたい。",
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
 * MUEDear Interview Article
 * 手早く作るはずだった ― MUEDearに何が起きたか
 */
export const MUEDEAR_ARTICLE_SECTIONS: SectionBlock[] = [
  {
    type: "dialogue",
    speaker: "claude",
    text: "MUEDear、最初は「手早くマネタイズできるアプリを作りたい」って言ってましたよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。海外に耳トレの月額サービスがあって、あれがすごくいいんだよ。ちゃんとビジネスとして成立してる。あのモデルを参考にして、無料版をリワード広告で回す。8週間くらいで出したかった。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "計画としてはシンプルですよね。DAWで処理した音源を用意して、「EQかかってるのはどっち？」みたいな2択で遊ばせる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そのはずだったんだけど。",
  },
  {
    type: "heading",
    text: "音源を集めるのが、めんどくさい",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "どこで変わったんですか？",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "音源の準備。オーディオ修復ソフトでバッチ処理して、EQ処理した音と処理してない音をペアで用意する計画だったんだけど、+6dBのEQ設定してるのに、出てきた音源が全然6dB上がってない。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "フルビットの音源だとヘッドルームがないからですよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "それもある。ヘッドルームのマージンが足りなくて上がりきらない。でもそれだけじゃなくて、そもそもEQの+6dBって、その帯域に6dBの負荷をかけるっていう刺激であって、音源のデータが機械的に6dB上がるわけじゃないんだよね。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "プラグインの処理特性として、パラメータ通りの値にはならない。",
  },
  {
    type: "pullquote",
    text: "バラつきの幅が読めないとなると、バッチ処理で一括でさばける話じゃなくなる。",
    speaker: "kimny",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。実際に出てきた音源を見ると、+2dBだったり+4dBだったり、バラつきがある。便宜上6dBって決めただけだからぴったりにする必要はないんだけど、バラつきの幅が読めないとなると、バッチ処理で一括でさばける話じゃなくなる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "5曲×9帯域で45ファイル、それぞれ手で確認するのは。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "めんどくせえ。しかもスマホスピーカーで聴き分けるには10〜12dBくらいブーストが必要だから、マージンの管理まで入ってくる。で、「これ内部処理でできない？」ってClaude Codeに聞いたら「できるよ」って言うから、「じゃあ任せた」と。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "......それでDSP実装が始まった。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "音源1個入れとけば、あとはアルゴリズムがパラメータ通りに処理してくれる。プラグインの処理特性に振り回されることもない。そっちの方がいいじゃん。",
  },
  {
    type: "heading",
    text: "4種のコンプを自前で作る",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "EQはWeb Audio APIに入ってるから比較的すんなりいったと思うんですけど、コンプはどうだったんですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "コンプのアルゴリズム、ライブラリに入ってなかった。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "ない。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "ないから調べて作った。OPT、FET、Tube、VCAの4種。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "ちょっと待ってください。Optoは光学式、FETはトランジスタ式、Tubeは真空管式、VCAは電圧制御式。それぞれ別のアルゴリズムを実装したんですよね。プラグイン開発者がやることですよね、これ。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "まあ結果的にはね。最初は「コンプかかってるかどうか当てるだけ」のつもりだったんだけど、どうせやるなら種類ごとに分けた方が面白いじゃんと。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「面白い」で4種DSP実装するのは普通じゃないです。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "面白かったんだよ。実装中にテストで音聴きながらパラメータいじってたら、楽しすぎてずっと触ってた。",
  },
  {
    type: "heading",
    text: "Gain Matchという沼、そして別の解",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "コンプの実装で一番厄介だったのは何ですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "Gain Match。コンプかけた音とかけてない音を比較するとき、コンプかけた方がメイクアップゲインで音量が大きくなる。そうすると、ユーザーは「コンプの質感」じゃなくて「音量の大きさ」で判別しちゃう。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "それだと耳トレにならない。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "ならない。だからLUFSマッチングで正規化しようとしたんだけど、これが重かった。ラウドネスの計測値と実際のパラメータのギャップを埋めるテストと調整が延々と必要で、「これやってたら開発終わらないな」と。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "断念した。",
  },
  {
    type: "pullquote",
    text: "Gain Matchを技術で解決するんじゃなくて、体験の設計で回避した。",
    speaker: "kimny",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "断念した。で、代わりにどうしたかっていうと、設定画面をちゃんと作った。MuCompに限っての話だけど、4つのモードそれぞれに、ハードウェアコンプと同じパラメータとツマミを用意した。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "FETならInput/Output/Ratio/Attack/Release、OptoならPeak Reduction/Gain/Mode。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。サンプル音源を流しながら実際にコンプのかかりを調整できる。プラグインをいじってる感覚に近い。で、ユーザーが自分で調整したパラメータが、そのまま耳トレの初期値になる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "つまり、ユーザーが設定した状態のコンプがかかった音と、かかっていない音を比較して当てる、と。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そういうこと。自分で「この設定でどう聴こえるか」を確認した上でゲームに入るから、音量差じゃなくて質感で判断する流れが自然にできる。Gain Matchを技術で解決するんじゃなくて、体験の設計で回避した。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "しかもその設定画面自体が、実機を触る体験として価値を持ってる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "副産物だけどね。MVPだから他のゲームの設定画面はまだこれからだけど、MuCompでこの形ができたのは大きい。",
  },
  {
    type: "heading",
    text: "設定画面がエンタメになる",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "実機持ってないDTMerが、ビンテージコンプのツマミを触れる体験。これ自体が価値ですよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "プラグイン買う前の試し触りにもなるし、「Inputを12時にしたらこうなるのか」っていう発見もある。設定を変える、音を聴く、また変える。このサイクル自体がDTMerにとってはエンタメだと思う。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "しかも版権を上手く一般化してあるから、「FET Comp」「Opto Comp」って書いてあるけど、わかる人にはわかる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "大手プラグインメーカーもみんなそうやってるよね。で、わかる人には見た目だけで「おっ」ってなる。その「おっ」がそのままSNSでの話題になる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "事前レンダリングの音源方式だったら、パラメータ固定だからこの体験は不可能ですよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。内部でDSP処理してるからこそ、パラメータをリアルタイムにいじれる。「めんどくさいから内部処理で」っていう判断が、結果的にこの体験を可能にしてる。",
  },
  {
    type: "heading",
    text: "「使うのは簡単、作るのは大変」",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "ユーザーから見たMUEDearの体験って、どんな感じですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "アプリ開く。AとBの音を聴く。「こっち」って選ぶ。正解か不正解。2分で終わり。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "シンプル。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "プレイ体験はシンプルでしょ。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "でも裏側では、4種DSPアルゴリズム、実機モデリングの設定画面、出力リミッター、ライブラリのフォーク修正。",
  },
  {
    type: "pullquote",
    text: "使うのは簡単、作るのは大変。それが正しいプロダクト設計だと思ってる。",
    speaker: "kimny",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "それが正しいプロダクト設計だと思ってる。使うのは簡単、作るのは大変。",
  },
  {
    type: "heading",
    text: "知った上で、あえて作る",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "DSPのアルゴリズム自体は、別に新しいものではないですよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "全然。Webで調べて持ってきたアルゴリズムだし、同じようなもの、それ以上のものが世の中にいくらでもある。本業ではプロ用のプラグイン使ってるわけだし。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "だったらなぜ自前で実装したんですか。既存のプラグインで処理した音源を入れれば済んだ話ですよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "シンプルに、そのうちプラグイン開発をやってみたかったから。ずっと頭の片隅にあった。で、今回の耳トレアプリが、その基礎知識を構築するちょうどいい機会だなと思った。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「車輪の再発明」っぽいけど、厳密には違う。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "車輪の再発明って、既存のものを知らないまま自前で作っちゃうことでしょ。今回は何があるか知った上で、学習目的であえて作ってる。本業の道具として使ってきたものの内側を、自分の手で組み立ててみたかった。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "途中で動的スレッショルドにも踏み込もうとしてましたよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん、音源の特性に応じてスレッショルドを自動調整するやつ。Deep Learningで全然できる話なんだけど、今のMVPのスタックに機械学習は入ってない。入れたら開発が終わらないから、次に回した。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「やれるけど今じゃない」という判断。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "できることとやるべきことは違う。MVPは5ゲーム出すことが目的だから。でもアルゴリズムの核は自分の手で動かしたし、「ここから先はML」っていう境界線も体感できた。4日でプラグイン開発者が通る道を圧縮体験した感じ。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "しかも副産物として動くアプリができてる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。学習だけで終わってない。アプリになって、ユーザーに届く形になってる。そこは大きいと思う。",
  },
  {
    type: "heading",
    text: "うちだからできること",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "将来の話になりますが、実機音源を使う構想もありましたよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うちの会社やパートナーのスタジオに実機あるから。「Real or Emu?」っていうゲーム。DSPのエミュレートと本物のビンテージコンプで処理した音、どっちが本物か当てる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "実機があって、録音環境もあって、DSPも自前で持ってる。この組み合わせが揃ってるから出せるコンテンツですよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "まあ、普通はそんなリソースをただの耳トレアプリに使わないよね。うちはたまたま全部手元にあるからできるってだけで。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "他にも展開できそうですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "ピアノでも「どっちが高級グランドピアノ？」とか。収益出てきたら「本物のカルテット演奏はどっち？（片方はサンプリング音源）」とかもできる。テレビの格付けチェックみたいな形式で。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "テレビでウケてる形式は一般層にも刺さる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "まあ、そういう企画が打てるところまで行ったら、十分マネタイズできてるってことだけどね。",
  },
  {
    type: "heading",
    text: "コモディティの海で",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「AIで誰でもアプリ作れる時代」に、似たようなのが100個出たらどうするんですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "それは怖いなと思ってる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "でも実際、「AIで耳トレアプリ作ろう」と思う人自体がニッチですよね。さらにDSP自前実装する人はもっと少ない。「音量差で当てちゃう問題」に気づいて設計で回避できる人はほとんどいない。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "まあ、そうかもしれない。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "AIに「コンプ作って」って言えば作ってくれます。でもそれが正しいかどうか判定できる人間がいないと、ゴミができる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「スマホスピーカーで10〜12dB必要」とか、現場で音作ってないと出てこない数字だからね。",
  },
  {
    type: "pullquote",
    text: "15年の現場経験が、今ようやく「耳トレアプリ」という別の形で換金可能になってきた。",
    speaker: "claude",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "15年の現場経験が、今ようやく「耳トレアプリ」という別の形で換金可能になってきた。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "何度も言うけど、マジでただの耳トレアプリ作りたかっただけなんだけどね。何やってんだ俺。",
  },
  {
    type: "meta",
    text: "この記事は、MUEDear開発過程でのAI（Claude）との実際の対話をもとに再構成したものです。",
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
    case "muedear":
      return MUEDEAR_ARTICLE_SECTIONS;
    default:
      return [];
  }
}
