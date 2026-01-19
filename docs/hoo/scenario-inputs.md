# Test Scenario Inputs

Copy-paste these for testing.

## 1_greeting
```
こんにちは
```

## 2_creative
```
曲が完成しないんだよね。途中まではいいんだけど、いつも最後まで作れない。
```

## 3_organize
```
最近考えてることがバラバラで整理できてない。新しいアルバムのコンセプトと、ライブの準備と、SNSの発信と...全部やらなきゃいけないんだけど、どこから手をつけていいかわからない。
```

## 4_summary
```
ここまでの話をまとめて
```

## 5_expertise
```
最近、マスタリングでMS処理使ってるんだけど、Mid成分とSide成分のバランスが難しくて。特に低域の処理で迷ってる。
```

## 6_stuck
```
うーん、やっぱりよくわからない。どうすればいいんだろう...
```

---

## CSV Columns

| Column | Description |
|--------|-------------|
| scenario | Test scenario ID |
| model | Model name |
| hoo_score | Character consistency (1-5) |
| quality_score | Response quality (1-5) |
| latency_ms | Response time in ms |
| cost_jpy | Cost in JPY |
| context_score | Context retention (1-5) |
| notes | Free text notes |
