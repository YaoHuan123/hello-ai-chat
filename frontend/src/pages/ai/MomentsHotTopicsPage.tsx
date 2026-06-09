import { useState } from "react";
import { PASSIVE_HOT_TOPICS } from "../../data/passiveCloneTopics";
import { getPassiveCloneItems } from "../../services/passiveCloneLocalStorage";
import { flushMomentsSync } from "../../services/momentsSync";
import { MomentsTopicSection } from "./passive/MomentsTopicSection";

type Props = {
  onBack: () => void;
};

export function MomentsHotTopicsPage({ onBack }: Props) {
  const [epoch, setEpoch] = useState(0);

  function onCollected() {
    flushMomentsSync(getPassiveCloneItems());
    setEpoch((e) => e + 1);
  }

  return (
    <div className="aichat-shell moments-hot-page moments-hot-page--layered">
      <header className="aichat-topbar aichat-topbar-flex moments-layered-topbar">
        <button className="moments-layered-topbar__btn" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>热点</h1>
        </div>
        <div className="aichat-topbar-spacer" aria-hidden />
      </header>

      <div className="aichat-main aichat-page-main moments-hot-page__main">
        <MomentsTopicSection key={epoch} title="" topics={PASSIVE_HOT_TOPICS} onCollected={onCollected} variant="layered" />
      </div>
    </div>
  );
}
