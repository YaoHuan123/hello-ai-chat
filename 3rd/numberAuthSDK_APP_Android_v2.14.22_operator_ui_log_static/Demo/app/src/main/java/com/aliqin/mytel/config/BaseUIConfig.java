package com.aliqin.mytel.config;

import android.app.Activity;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.util.TypedValue;
import android.view.Surface;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;
import com.aliqin.mytel.AppUtils;
import com.aliqin.mytel.Constant;
import com.aliqin.mytel.R;
import com.mobile.auth.gatewayauth.PhoneNumberAuthHelper;

import static com.aliqin.mytel.AppUtils.dp2px;

public abstract class BaseUIConfig {
    public Activity mActivity;
    public Context mContext;
    public PhoneNumberAuthHelper mAuthHelper;
    public int mScreenWidthDp;
    public int mScreenHeightDp;

    public static BaseUIConfig init(int type, Activity activity, PhoneNumberAuthHelper authHelper) {
        switch (type) {
            case Constant.FULL_PORT:
                return new FullPortConfig(activity, authHelper);
            case Constant.FULL_LAND:
                return new FullLandConfig(activity, authHelper);
            case Constant.DIALOG_PORT:
                return new DialogPortConfig(activity, authHelper);
            case Constant.DIALOG_LAND:
                return new DialogLandConfig(activity, authHelper);
            case Constant.DIALOG_BOTTOM:
                return new DialogBottomConfig(activity, authHelper);
            case Constant.CUSTOM_VIEW:
                return new CustomViewConfig(activity, authHelper);
            case Constant.CUSTOM_XML:
                return new CustomXmlConfig(activity, authHelper);
            case Constant.CUSTOM_GIF:
                return new CustomGifConfig(activity, authHelper);
            case Constant.CUSTOM_MOV:
                return new CustomMovConfig(activity, authHelper);
            case Constant.CUSTOM_PIC:
                return new CustomPicConfig(activity, authHelper);
            case Constant.FULL_PORT_PRIVACY:
                return new FullPortPrivacyConfig(activity, authHelper);
            case Constant.FULL_PORT_PRIVACY_XML:
                return new FullPortPrivacyXmlConfig(activity, authHelper);
            case Constant.FULL_LAND_PRIVACY:
                return new FullLandPrivacyConfig(activity, authHelper);
            case Constant.FULL_PORT_PRIVACY_VIEW:
                return new FullPortPrivacyViewConfig(activity, authHelper);
            default:
                return null;
        }
    }

    public BaseUIConfig(Activity activity, PhoneNumberAuthHelper authHelper) {
        mActivity = activity;
        mContext = activity.getApplicationContext();
        mAuthHelper = authHelper;
    }

    protected View initSwitchView(int marginTop) {
        TextView switchTV = new TextView(mContext);
        RelativeLayout.LayoutParams mLayoutParams = new RelativeLayout.LayoutParams(RelativeLayout.LayoutParams.WRAP_CONTENT, dp2px(mContext, 50));
        //一键登录按钮默认marginTop 270dp
        mLayoutParams.setMargins(0, dp2px(mContext, marginTop), 0, 0);
        mLayoutParams.addRule(RelativeLayout.CENTER_HORIZONTAL, RelativeLayout.TRUE);
        switchTV.setText(R.string.switch_msg);
        switchTV.setTextColor(Color.BLACK);
        switchTV.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.0F);
        switchTV.setLayoutParams(mLayoutParams);
        return switchTV;
    }

    protected View initLogoView(int left) {
        ImageView imageView=new ImageView(mContext);
        RelativeLayout.LayoutParams mLayoutParams = new RelativeLayout.LayoutParams(dp2px(mContext, 30), dp2px(mContext, 30));
        //一键登录按钮默认marginTop 270dp
        //mLayoutParams.setMargins(dp2px(mContext,mContext.getResources().getDimension(R.dimen.margin_left)), dp2px(mContext, 10), 0, 0);
        imageView.setImageDrawable(mContext.getResources().getDrawable(R.drawable.phone));
        imageView.setLayoutParams(mLayoutParams);
        return imageView;
    }

    protected View initInputView(int marginTop) {
        EditText editText = new EditText(mContext);
        RelativeLayout.LayoutParams mLayoutParams = new RelativeLayout.LayoutParams(dp2px(mContext,200), dp2px(mContext, 50));
        //一键登录按钮默认marginTop 270dp
        mLayoutParams.setMargins(0, dp2px(mContext, marginTop), 0, 0);
        mLayoutParams.addRule(RelativeLayout.CENTER_HORIZONTAL, RelativeLayout.TRUE);
        editText.setTextColor(Color.BLACK);
        editText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.0F);
        editText.setLayoutParams(mLayoutParams);
        return editText;
    }

    protected void updateScreenSize(int authPageScreenOrientation) {
        int screenHeightDp = AppUtils.px2dp(mContext, AppUtils.getPhoneHeightPixels(mContext));
        int screenWidthDp = AppUtils.px2dp(mContext, AppUtils.getPhoneWidthPixels(mContext));
        int rotation = mActivity.getWindowManager().getDefaultDisplay().getRotation();
        if (authPageScreenOrientation == ActivityInfo.SCREEN_ORIENTATION_BEHIND) {
            authPageScreenOrientation = mActivity.getRequestedOrientation();
        }
        if (authPageScreenOrientation == ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                || authPageScreenOrientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                || authPageScreenOrientation == ActivityInfo.SCREEN_ORIENTATION_USER_LANDSCAPE) {
            rotation = Surface.ROTATION_90;
        } else if (authPageScreenOrientation == ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                || authPageScreenOrientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
                || authPageScreenOrientation == ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT) {
            rotation = Surface.ROTATION_180;
        }
        switch (rotation) {
            case Surface.ROTATION_0:
            case Surface.ROTATION_180:
                mScreenWidthDp = screenWidthDp;
                mScreenHeightDp = screenHeightDp;
                break;
            case Surface.ROTATION_90:
            case Surface.ROTATION_270:
                mScreenWidthDp = screenHeightDp;
                mScreenHeightDp = screenWidthDp;
                break;
            default:
                break;
        }
    }

    public  static Typeface createTypeface(Context mContext, String fileName){
        Typeface typeFace = Typeface.createFromAsset(mContext.getAssets(),fileName);
        return typeFace;
    }

    public abstract void configAuthPage();

    /**
     *  在横屏APP弹竖屏一键登录页面或者竖屏APP弹横屏授权页时处理特殊逻辑
     *  Android8.0只能启动SCREEN_ORIENTATION_BEHIND模式的Activity
     */
    public void onResume() {

    }
}
