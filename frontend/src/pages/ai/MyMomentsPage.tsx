import { useEffect, useState } from "react";
import { getPassiveCloneItems } from "../../services/passiveCloneLocalStorage";
import { flushMomentsSync } from "../../services/momentsSync";
import { MomentsAddPage } from "./MomentsAddPage";
import { MyMomentsFeed } from "./passive/MyMomentsFeed";

type Props = {
  onBack: () => void;
};

export function MyMomentsPage({ onBack }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [dataEpoch, setDataEpoch] = useState(0);

  function bump() {
    setDataEpoch((e) => e + 1);
  }

  useEffect(() => {
    flushMomentsSync(getPassiveCloneItems());
  }, []);

  if (showAdd) {
    return (
      <MomentsAddPage
        onBack={() => setShowAdd(false)}
        onDone={() => {
          bump();
          setShowAdd(false);
        }}
      />
    );
  }

  return (
    <div className="aichat-shell moments-my-page">
      <header className="aichat-topbar aichat-topbar-flex moments-layered-topbar">
        <button className="moments-layered-topbar__btn" type="button" onClick={onBack}>
          返回
        </button>
        <div className="aichat-stage-head">
          <h1>我的朋友圈</h1>
        </div>
        <button className="moments-layered-topbar__btn" type="button" onClick={() => setShowAdd(true)}>
          添加
        </button>
      </header>

      <div className="aichat-main aichat-page-main moments-my-page__main">
        <MyMomentsFeed refreshKey={dataEpoch} onChanged={bump} />
      </div>
    </div>
  );
}
