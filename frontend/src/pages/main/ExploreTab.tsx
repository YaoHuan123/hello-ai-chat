import { AppIcon } from "../../components/AppIcons";

import { YIYI } from "../../constants/productCopy";

import type { RouteName } from "../../types/routes";



type Props = {

  onNavigateFeature: (route: RouteName) => void;

};



const ENTRIES = [

  {

    route: "moments-hub" as const,

    title: "朋友圈",

    sub: "好友近况与话题",

    icon: "hot" as const,

    tone: "moments",

  },

  {

    route: "yiyi-home" as const,

    title: YIYI.name,

    sub: "对外沟通中间人",

    icon: "user" as const,

    tone: "yiyi",

  },

];



export function ExploreTab({ onNavigateFeature }: Props) {

  return (

    <div className="aichat-main-shell-tab explore-tab">

      <header className="explore-tab__topbar">

        <h1>发现</h1>

        <p className="explore-tab__lead">从这里认识好友、维护朋友圈，或与 YiYi 对外沟通。</p>

      </header>



      <div className="explore-tab__main">

        <div className="explore-entry-grid" role="list" aria-label="发现入口">

          {ENTRIES.map((entry) => (

            <button

              key={entry.route}

              type="button"

              role="listitem"

              className={`explore-entry-tile explore-entry-tile--${entry.tone}`}

              onClick={() => onNavigateFeature(entry.route)}

            >

              <span className={`explore-entry-tile__icon explore-entry-tile__icon--${entry.tone}`} aria-hidden>

                <AppIcon

                  name={entry.icon}

                  className={`app-icon app-icon--md app-icon--${entry.tone === "yiyi" ? "purple" : "hot"}`}

                />

              </span>

              <span className="explore-entry-tile__body">

                <span className="explore-entry-tile__title">{entry.title}</span>

                <span className="explore-entry-tile__sub">{entry.sub}</span>

              </span>

            </button>

          ))}

        </div>

      </div>

    </div>

  );

}

