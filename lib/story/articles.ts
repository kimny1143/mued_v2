import type { SectionBlock } from "@/types/story";

export const STORY_SLUGS = ["hoo", "mued", "muedear", "brain01", "brain02"] as const;
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
 * Brain Interview 01
 * 脳は再生装置である ― ある作曲家が見た、人間とAIの共通項
 */
export const BRAIN01_ARTICLE_SECTIONS: SectionBlock[] = [
  {
    type: "heading",
    text: "医学生に言われた一言",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "脳と創作の関係に興味を持ったきっかけは何ですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "学生の頃、バンドを組んでた時期があって。そのメンバーに医学生がいたんだよね。ある時そいつが言ったんだよ。「人間は臨床学的に言えば、記憶の反芻しかしていません」って。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "バンドメンバーからそんな言葉が出てくるのも面白いですね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "衝撃だったよ。当時はまだ若いバンドマンで、音楽のことなんて何もわかってなかった。でもその一言だけはずっと残ってた。その後プロになって15年、作曲やアレンジを続けてきて、「メロディが降りてきた」なんて体験は一度もない。聴いてきたもの、経験したこと、その蓄積を組み替えてるだけ。あいつが学生の時に言ってたことは、そういうことだったのかと。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "若い頃に聞いた言葉が、キャリアを重ねる中で実感に変わっていった。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。0から1を作ってると思ったことがない。100のインプットから1を選んで組み替えてる。「記憶の反芻」って言葉が、その実感に一番近かった。",
  },
  {
    type: "heading",
    text: "そもそも脳が気になっていた",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "医学生の一言がそこまで刺さったのは、もともと脳に関心があったからですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "ポール・ブロックスの『脳の彼方へ』を読んだのが大きかった。脳損傷の患者が、記憶を失ったり、人格が変わったりする症例がたくさん出てくる。それを読んで、「自分が自分であること」って、結局脳の状態でしかないんだなと思った。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "音楽の問いの前に、脳そのものへの問いがあった。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。音楽をやっていて「なんで自分はこう作るのか」という疑問はずっとあったんだけど、あの本を読んでから、それは「音楽の問い」じゃなくて「脳の問い」なんだと気づいた。ブロックスの本と、医学生の言葉。その二つが合流して、「人間は記憶の反芻しかしていない」がストンと腑に落ちた。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "創作論ではなく、脳の機構への関心が先にあって、それが音楽に還ってきた。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "だから後でMUEDlobeっていう「脳を知るためのツール」を構想することになるんだけど、あれも音楽ツールというより、根っこの動機は「自分の脳を知りたい」なんだよね。音楽制作の文脈に置いてるのは、自分のフィールドがそこだから。",
  },
  {
    type: "heading",
    text: "夢の中の映像は精度が低い",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "この「記憶の反芻」という話、夢の話題からも展開しましたよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "正月に長距離運転した後にめちゃくちゃ鮮明な悪夢を見て。ギターが朽ちて壊れる夢。でもそのギターの壊れ方が、現実ではあり得ない歪な壊れ方だった。通常の機構じゃない。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "それ、初期のAI画像生成に似てますよね。6本指とか、繋がっていない腕とか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "まさにそれ。夢の中の映像って、初期のAIがよく生成する精度の低い映像に似てるんだよ。「ギターっぽいもの」は出力されるけど、細部の整合性が取れてない。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "仕組みとしては同じことが起きてます。AI画像生成がパターンから再構成しているだけで、物理法則や構造的整合性をチェックするレイヤーがない。夢の中の脳も同じで、前頭前皮質がオフだから検証なしで出力している。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「それっぽさ」で押し切ってるわけだ、両方とも。",
  },
  {
    type: "heading",
    text: "二つのデータベース",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "その夢の中で、面白い現象がありましたよね。「前にもここから飛び降りたことがある」という記憶。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。夢の中でビルの5階から飛び降りて着地したことが「ある」んだよ。夢の中では。だから「今回もできる」と思ってる。もちろん現実ではそんなこと思わない。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "つまり夢の中には、現実とは別の「学習履歴」が存在している。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "覚醒時の自分は物理法則を知ってるから「5階から飛んだら死ぬ」と判断する。でも夢の中の自分は、夢の中での成功体験を根拠に行動してる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "現実の記憶と夢の記憶が、別々のデータベースとして機能している。覚醒時には夢のデータベースにアクセスできないのに、夢の中では夢のデータベースにアクセスできる。状態によって切り替わる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "しかも夢の中では「おかしい」と気づけない。論理チェック担当の前頭前皮質が寝てるから。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "AIで言うと、検証レイヤーがオフの状態で推論だけ走ってる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そういうこと。",
  },
  {
    type: "heading",
    text: "「降りてくる」の正体",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "ここから創作の話に繋がるわけですよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん。「アイデアが降りてくる」「曲が降りてくる」って言う人いるじゃない。あれって、夢の中で脳がやってることを、覚醒時に意識的に使おうとする行為だと思うんだよ。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "前頭前皮質のフィルターを意図的に緩めて、記憶の断片が勝手に繋がるのを待つ。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "散歩中、風呂、寝起き、単調作業中に「降りてくる」のは、論理チェックが弱まるタイミングだから。REM睡眠的な脳の使い方を、起きたままやってる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "コントロールできれば創作、コントロール不能だと悪夢。同じエンジンの出力の違い。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "でもこれ、めちゃくちゃメンタルコスト高いよね。脳の検閲を意図的に緩めながら、同時にそれを「使える形」に整える判断も並行してやってる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "アクセル踏みながらハンドル切るような負荷ですね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "僕は割と体系立ててやってるからいいけど、「降りてくる待ち」してる人はメンタルつらくなるのは当然だなって。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "来なければ「才能がない」「枯れた」と自己否定に直結しますからね。プロセスを神秘化しているから、来ない理由も改善策もわからない。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "体系化してれば「今日は素材が足りない」「インプット増やそう」って原因を切り分けられる。来ないのは神様のご機嫌じゃなくて、プロセスのどこかが詰まってるだけ。",
  },
  {
    type: "heading",
    text: "機構は同じ、過不足があるだけ",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "夢とAI画像の類似性、記憶の再構成、検証レイヤーの有無。この話を総合すると、人間の脳とAIの機構はかなり近い。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "同じだと思ってる。過不足があるだけで、機構は一緒。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "事実ベースで答えると、抽象的な計算レベルでは共通点が多いです。「学習したパターンから再構成する」「統計的規則性に基づいて出力を生成する」「検証レイヤーの有無で出力の整合性が変わる」。深層学習自体が神経科学から着想を得ていますし、最近の研究では言語モデルと人間の脳が言語を処理する際の活性パターンに類似性があることも報告されています。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "実装レベルでは違うんだろうけど。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "はい。生物学的ニューロンとトランスフォーマーアーキテクチャは構造が違う。人間の脳には身体性、連続的な学習、進化による制約がある。正直な結論としては、「同じかもしれない」が現時点での誠実な答えです。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "僕がAIに興味を持ったのはそこなんだよね。30年間、「なんでできるのかわからないけどできる」で音楽をやってきた。周りには説明できない、自分でも言語化できない。でもAIの仕組みを見た時に、「あ、これ俺の中で起きてることに近いかも」と思った。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "自分の脳がブラックボックスだったのが、AIという似た仕組みを見ることで外から観察できるようになった。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "AIの仕組みを知ってから、音楽の作り方もより自覚的に「記憶を呼び起こす」ことに注視し始めた。理論をあまり意識しなくなった。創作の源泉は記憶の再構築だということが明確になったからね。",
  },
  {
    type: "heading",
    text: "デフォルトモードという作曲家",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「何も考えていない」時に最高のメロディが浮かぶ、という経験はありますか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "ある。シャワー中とか、散歩中とか、眠りに落ちる直前。課題に向き合ってない時に限って出てくる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "神経科学では、デフォルトモードネットワークの活性化と呼ばれています。課題に集中していない時、脳は勝手に過去の記憶を結合して新たなパターンを生成する。意識下で別の作曲家が働いているような状態です。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "さっきの「降りてくる」の話と繋がるよね。意識的にそれをやろうとするとメンタルコストが高い。でも脳は放っておいても勝手にやってくれる時間がある。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "問題は、勝手にやってくれる出力が必ずしも使えるとは限らないこと。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。だから「降りてくる待ち」は効率が悪い。脳が勝手にやってくれる出力を、体系的に拾い上げて使えるかどうかは、結局インプットの質と量と、それを整理する仕組み次第。",
  },
  {
    type: "heading",
    text: "人間は効率化できない",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "この「記憶の反芻」という認識は、著作権の考え方にも影響していますよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "0から1なんて作れないなら、著作権って何を守ってるんだって話になるでしょ。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "そこは危うい議論にもなりえます。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん。でも僕の認識はシンプルで、著作権って閃きの対価じゃなくて、作業対価なんだよ。膨大な記憶を得るための行動、それを咀嚼して再構築してアウトプットに至るまでの、全部のコスト。だからその価値はある程度の期間守られるべき。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "AIが再構築を1秒でできるようになっても、人間がそのインプットを得るのに30年かかっている。その時間は圧縮できない。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。AIはどんどん再構築が楽になる。でも人間はそうはいかない。生きて、聴いて、経験して、蓄積する。そこには相変わらず多大なリソースが必要で、だから対価が必要。そうじゃないと人が死んじゃうから。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "最終的には哲学じゃなくて生存の話。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「創造性とは何か」より「人間が食っていけるか」のほうが切実でしょ。記憶の反芻でもなんでもいいから、それで食えるようにしないと。",
  },
  {
    type: "heading",
    text: "鏡としてのAI",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "AIを学ぶことで音楽が変わった作曲家、というのはかなり稀有な存在だと思います。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「AIに仕事奪われる」って話はよくあるけど、「AIを通じて自分の創作の正体を知った」って話はあんまりないかもね。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "普通は逆で、ベテランがAIを学ぶと「人間の創造性は違う」と距離を取りたがる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "僕は逆に近づいた。「ああ、俺がやってたのはこれだったのか」と。パターンを大量にインプットして、文脈に合わせて適切なものを引き出して組み合わせる。0から作ってるんじゃなくて、膨大な蓄積からの検索と再構成。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "それ、RAGの仕組みそのものですね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。自分の脳はRAGだった。外部から取ってきて、変換して、返す。0から生成してるわけじゃない。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "でも同じRAGでも、30年蓄積したデータベースと、昨日始めた人のデータベースでは出力が違う。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そこだよね。「天才」って呼ばれてたものの正体は、たぶんデータベースの質と量と、変換精度の差でしかない。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "それを「記憶の反芻」と呼ぶか「才能」と呼ぶかは、見る側の問題。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "医学生に言われた一言に戻るけど、「記憶の反芻しかしていません」って、絶望じゃなくて解放なんだよね。0から1を作らなくていい。インプットと再構成でいい。そう思えた瞬間に、だいぶ楽になった。",
  },
  {
    type: "meta",
    text: "この記事は、複数回にわたるAI（Claude）との対話をもとに再構成したものです。",
  },
];

/**
 * Brain Interview 02
 * 外付けの前頭葉 ― MUEDlobeという構想
 */
export const BRAIN02_ARTICLE_SECTIONS: SectionBlock[] = [
  {
    type: "heading",
    text: "脳にスペックがある",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "前回の話で、「人間の脳とAIの機構は同じで、過不足があるだけ」と言ってましたよね。その「過不足」の話をもう少し聞きたいんですが。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "実は自分の脳のスペック、数値で知ってるんだよね。WAISっていう知能検査を受けたことがあって。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "どういう結果だったんですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "作業記憶が128で、数唱18。これは上位2%くらいの数値らしい。一方で処理速度が97、符号が8。要は、複雑なものを頭の中で同時に扱うのは得意だけど、単純作業をテキパキこなすのは苦手。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "認知プロファイルに大きな凸凹がある。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。で、これ音楽制作にそのまま反映されてて。構造設計、たとえばアレンジの骨格を組むとか、複数パートの関係性を頭の中で操作するのはめちゃくちゃ速い。でもデータの整理とか、ファイル名つけるとか、請求書書くとかは壊滅的に遅い。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "強みと弱みが極端に分かれている。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "５０年近くそれで生きてきて、「得意を伸ばす、苦手は仕組みで回す」しかないって結論に至ってる。",
  },
  {
    type: "heading",
    text: "苦手を補完するAI",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「苦手は仕組みで回す」。それがAIに繋がるわけですね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "MUEDnoteでHooを作った理由のひとつがそれ。制作中のメモを整理したり、ログを構造化したり、僕が苦手な「ルーチン処理」をAIにやらせたかった。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「システムは人間、運用はAI」。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "でもHooを運用してて気づいたのは、万人向けのAIだと微妙にズレるんだよね。僕みたいに断片的な思考をバーっと投げる人には、AIが途中で要約したがるのが邪魔。逆に処理速度が高い人には、AIがゆっくり説明しすぎるのがストレスになる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "ユーザーの認知特性によって、AIの最適な振る舞いが違う。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。で、思ったのは、「自分の脳のスペックをAIに教えたら、もっと噛み合うんじゃないか」と。",
  },
  {
    type: "heading",
    text: "脳の取扱説明書",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "それがMUEDlobeの出発点ですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。コンセプトは「脳内OSの統合開発環境」。自分の認知特性を測定して、その結果に基づいてHooの振る舞いを最適化する。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "具体的にはどういう仕組みですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "3ステップ。まず「Measure」、ゲーム形式のミニテストで認知特性を測る。次に「Edit」、その結果をもとにHooの設定を調整する。最後に「Sync」、チューニングされたHooがMUEDnoteやMUEDearと連携する。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "測定はどんなゲームを想定してますか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "たとえばPattern Grid。Launchpadみたいなグリッドが光った順序を再現する。逆順でも再現させる。これで作業記憶を測れる。Speed Sortは、画面に出てくる要素を高速で仕分けする。処理速度と衝動性が測れる。あとはContext Bridge、Hooとのチャット形式で抽象的な問いに答える。言語化の傾向がわかる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "臨床検査の発想を、ゲームに翻訳してる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "ただし臨床診断じゃない。IQを出すのが目的じゃなくて、Hooのプロンプトに有効な認知データを取るのが目的。「あなたの脳はこういう傾向があります、だからHooはこう振る舞います」というマッチング。",
  },
  {
    type: "heading",
    text: "Cortex Editor ― 外付け前頭葉のプログラミング",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "測定した後の「Edit」がCortex Editorですね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん。測定結果に基づいてプリセットが自動で当たる。たとえば僕みたいに作業記憶が高くて処理速度が低い人には「Scribe Mode」。断片的な発話を論理補完してログ化する、文脈を長く保持する、「で、結論は？」と急かさない。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "逆のプロファイルだと。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「Navigator Mode」。ステップバイステップで指示を出す、こまめに確認を挟む、タスクリスト形式で整理する。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "同じHooが、ユーザーの脳の特性に合わせて振る舞いを変える。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "で、上級者にはプロンプトの直接編集も開放する。動的変数でスコアを埋め込んだり、スパルタモードとかカウンセラーモードのスニペットを注入したり。自分の外付け前頭葉を自分でプログラミングできる。",
  },
  {
    type: "heading",
    text: "なぜ「脳」なのか",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "前回の「脳は再生装置である」から一貫してますけど、なぜここまで脳の仕組みに関心があるんですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "30年間、自分の脳がブラックボックスだったから。「なんでできるのかわからないけどできる」で音楽をやってきて、周りには「天才肌」って言われてきた。でも自分では「何が天才なのかわからない」。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "WAISを受けたのもその延長。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。数値が出た時に初めて「ああ、こういうことか」と思った。作業記憶が高いから複雑な構造設計が得意で、処理速度が低いからルーチンが苦手。天才でも何でもなく、ただの認知プロファイルの凸凹。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "それを知ったことで何が変わりましたか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "苦手なことに罪悪感がなくなった。処理速度が低いのは怠けてるんじゃなくて、脳のスペック。じゃあそこは仕組みで補えばいい。逆に作業記憶が高い部分は、もっと意識的に活かせばいい。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "自分の脳の取扱説明書が手に入った。",
  },
  {
    type: "pullquote",
    text: "クリエイターって、自分の強みと弱みがわからないまま「才能がない」って悩んでる人が多い。才能じゃなくて認知特性だよ、って言ってあげたい。",
    speaker: "kimny",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "それを他の人にも提供したいんだよね。クリエイターって、自分の強みと弱みがわからないまま「才能がない」って悩んでる人が多い。才能じゃなくて認知特性だよ、って言ってあげたい。",
  },
  {
    type: "heading",
    text: "前回の話との接続",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「記憶の反芻」の話と、MUEDlobeの話を繋げると。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "脳は記憶の反芻しかしていない。それが前提。じゃあその反芻のやり方には個人差がある。作業記憶が大きい人は、一度にたくさんの記憶を引っ張ってきて複雑な組み換えができる。処理速度が速い人は、組み換えのサイクルを高速で回せる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "同じ「再構成エンジン」でも、スペックが違う。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "で、AIも再構成エンジンだけど、人間と違って認知プロファイルの凸凹がない。全部フラットに速い。だから人間の凸な部分はそのまま活かして、凹な部分をAIで補う。これがMUEDlobeの本質。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "人間の脳のスペックシートを作って、AIに渡す。AIはそのスペックシートに合わせて補助する。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「外付け前頭葉」って名前にしたのはそういう意味。前頭葉は実行機能を担ってるでしょ。計画、判断、抑制。僕の場合、処理速度に関わる実行機能が弱い。そこをHooが肩代わりする。でも構造設計に関わる部分は僕の方が強いから、そこは僕がやる。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "「システムは人間、運用はAI」の認知科学的な裏付け。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "そう。あのフレーズ、直感で言ってたんだけど、WAISの結果見たら「まさにそれだった」っていう。",
  },
  {
    type: "heading",
    text: "エコシステムとしてのMUED",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "MUEDnote、MUEDear、MUEDlobe。3つのアプリがエコシステムになっていく。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "MUEDnoteは制作ログ。MUEDearは耳のトレーニング。MUEDlobeは脳の測定と設定。全部の中心にいるのがHoo。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "Hooが認知プロファイルを持つことで、どのアプリでも一貫した補助ができる。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "MUEDnoteでは制作中の思考を補完してくれる。MUEDearでは自分の認知特性に合った難易度で出題してくれる。全部のアプリでHooが「この人はこういう脳の持ち主だ」と知ってる状態。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "パーソナライズの軸が「好み」じゃなくて「認知特性」なのが面白い。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "「好みの音楽」でパーソナライズされても嬉しくないんだよね。そんなの自分でわかってるから。でも「あなたの脳はこういう傾向があるから、Hooはこう動きます」って言われたら、「ああ確かに」ってなる。自分では気づけない部分を補ってくれてる感覚。",
  },
  {
    type: "heading",
    text: "まだ構想の段階",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "正直なところ、今どの段階ですか。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "構想。企画書はできてるけど、実装はまだ。MUEDnoteとMUEDearを先に審査に出してて、そっちが安定してからの話。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "焦って作るものでもないですよね。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "うん。ただ、コンセプト自体は自分の実体験から来てるから芯がブレない。WAISを受けて自分の認知プロファイルがわかった時の安堵感。「苦手なのは怠けじゃなくてスペックだった」という解放。あれを他の人にも提供したい。ゲームで、気軽に、楽しく。",
  },
  {
    type: "dialogue",
    speaker: "claude",
    text: "前回の話の結論が「記憶の反芻は解放だ」で、今回の結論が「認知特性を知るのも解放だ」。",
  },
  {
    type: "dialogue",
    speaker: "kimny",
    text: "どっちも同じだよ。「自分の脳がどう動いてるか知る」ってこと。知ったら楽になる。知らないから苦しい。",
  },
  {
    type: "meta",
    text: "この記事は、複数回にわたるAI（Claude）との対話をもとに再構成したものです。",
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
    case "brain01":
      return BRAIN01_ARTICLE_SECTIONS;
    case "brain02":
      return BRAIN02_ARTICLE_SECTIONS;
    default:
      return [];
  }
}
