package com.aliqin.mytel.config;

import android.app.Activity;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.text.TextUtils;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.Toast;

import com.aliqin.mytel.AppUtils;
import com.aliqin.mytel.R;
import com.mobile.auth.gatewayauth.AuthRegisterViewConfig;
import com.mobile.auth.gatewayauth.AuthRegisterXmlConfig;
import com.mobile.auth.gatewayauth.AuthUIConfig;
import com.mobile.auth.gatewayauth.AuthUIControlClickListener;
import com.mobile.auth.gatewayauth.CustomInterface;
import com.mobile.auth.gatewayauth.PhoneNumberAuthHelper;
import com.mobile.auth.gatewayauth.ResultCode;
import com.mobile.auth.gatewayauth.ui.AbstractPnsViewDelegate;

import org.json.JSONException;
import org.json.JSONObject;

import static com.aliqin.mytel.AppUtils.dp2px;

public class DialogLandConfig extends BaseUIConfig{
    private final String TAG = "DialogLandConfig";
    private int mOldScreenOrientation;


    public DialogLandConfig(Activity activity, PhoneNumberAuthHelper authHelper) {
        super(activity, authHelper);
    }

    @Override
    public void configAuthPage() {
        mAuthHelper.setUIClickListener(new AuthUIControlClickListener() {
            @Override
            public void onClick(String code, Context context, String jsonString) {
                JSONObject jsonObj = null;
                try {
                    if(!TextUtils.isEmpty(jsonString)) {
                        jsonObj = new JSONObject(jsonString);
                    }
                } catch (JSONException e) {
                    jsonObj = new JSONObject();
                }
                switch (code) {
                    //点击授权页默认样式的返回按钮
                    case ResultCode.CODE_ERROR_USER_CANCEL:
                        Log.e(TAG, "点击了授权页默认返回按钮");
                        mAuthHelper.quitLoginPage();
                        mActivity.finish();
                        break;
                    //点击授权页默认样式的切换其他登录方式 会关闭授权页
                    //如果不希望关闭授权页那就setSwitchAccHidden(true)隐藏默认的  通过自定义view添加自己的
                    case ResultCode.CODE_ERROR_USER_SWITCH:
                        Log.e(TAG, "点击了授权页默认切换其他登录方式");
                        break;
                    //点击一键登录按钮会发出此回调
                    //当协议栏没有勾选时 点击按钮会有默认toast 如果不需要或者希望自定义内容 setLogBtnToastHidden(true)隐藏默认Toast
                    //通过此回调自己设置toast
                    case ResultCode.CODE_ERROR_USER_LOGIN_BTN:
                        if (!jsonObj.optBoolean("isChecked")) {
                            Toast.makeText(mContext, R.string.custom_toast, Toast.LENGTH_SHORT).show();
                        }
                        break;
                    //checkbox状态改变触发此回调
                    case ResultCode.CODE_ERROR_USER_CHECKBOX:
                        Log.e(TAG, "checkbox状态变为" + jsonObj.optBoolean("isChecked"));
                        break;
                    //点击协议栏触发此回调
                    case ResultCode.CODE_ERROR_USER_PROTOCOL_CONTROL:
                        Log.e(TAG, "点击协议，" + "name: " + jsonObj.optString("name") + ", url: " + jsonObj.optString("url"));
                        break;
                    //用户调用userControlAuthPageCancel后左上角返回按钮及物理返回键交由sdk接入方控制
                    case ResultCode.CODE_ERROR_USER_CONTROL_CANCEL_BYBTN:
                        Log.e(TAG, "用户调用userControlAuthPageCancel后使用左上角返回按钮返回交由sdk接入方控制");
                        mAuthHelper.quitLoginPage();
                        mActivity.finish();
                        break;
                    //用户调用userControlAuthPageCancel后物理返回键交由sdk接入方控制
                    case ResultCode.CODE_ERROR_USER_CONTROL_CANCEL_BYKEY:
                        Log.e(TAG, "用户调用userControlAuthPageCancel后使用物理返回键返回交由sdk接入方控制");
                        mAuthHelper.quitLoginPage();
                        mActivity.finish();
                        break;

                    default:
                        break;

                }

            }
        });
        mAuthHelper.removeAuthRegisterXmlConfig();
        mAuthHelper.removeAuthRegisterViewConfig();
        mAuthHelper.removePrivacyAuthRegisterViewConfig();
        mAuthHelper.removePrivacyRegisterXmlConfig();
        int authPageOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE;
        if (Build.VERSION.SDK_INT == 26) {
            mOldScreenOrientation = mActivity.getRequestedOrientation();
            mActivity.setRequestedOrientation(authPageOrientation);
            authPageOrientation = ActivityInfo.SCREEN_ORIENTATION_BEHIND;
        }
        updateScreenSize(authPageOrientation);
        final int dialogWidth = (int) (mScreenWidthDp * 0.63);
        final int dialogHeight = (int) (mScreenHeightDp * 0.6);

        //sdk默认控件的区域是marginTop50dp
        int designHeight = dialogHeight - 50;
        int unit = designHeight / 10;
        int logBtnHeight = (int) (unit * 1.2);
        final int logBtnOffsetY = unit * 3;

        final View switchContainer = createLandDialogCustomSwitchView();
        mAuthHelper.addAuthRegistViewConfig("number_logo", new AuthRegisterViewConfig.Builder()
                .setView(initNumberView())
                .setRootViewId(AuthRegisterViewConfig.RootViewId.ROOT_VIEW_ID_NUMBER)
                .setCustomInterface(new CustomInterface() {
                    @Override
                    public void onClick(Context context) {

                    }
                }).build());
        mAuthHelper.addAuthRegistViewConfig("switch_other", new AuthRegisterViewConfig.Builder()
                .setRootViewId(AuthRegisterViewConfig.RootViewId.ROOT_VIEW_ID_NUMBER)
                .setView(switchContainer).build());
        mAuthHelper.addAuthRegisterXmlConfig(new AuthRegisterXmlConfig.Builder()
                .setLayout(R.layout.custom_land_dialog, new AbstractPnsViewDelegate() {
                    @Override
                    public void onViewCreated(View view) {
                        findViewById(R.id.tv_title).setVisibility(View.GONE);
                        findViewById(R.id.btn_close).setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
                                mAuthHelper.quitLoginPage();
                            }
                        });
                        int iconTopMargin = AppUtils.dp2px(getContext(), logBtnOffsetY + 50);
                        View iconContainer = findViewById(R.id.container_icon);
                        RelativeLayout.LayoutParams iconLayout = (RelativeLayout.LayoutParams) iconContainer.getLayoutParams();
                        iconLayout.topMargin = iconTopMargin;
                        iconLayout.width = AppUtils.dp2px(getContext(), dialogWidth / 2 - 60);
                    }
                })
                .build());
        mAuthHelper.setAuthUIConfig(new AuthUIConfig.Builder()
                .setAppPrivacyOne("《自定义隐私协议》", "https://www.baidu.com")
                .setAppPrivacyColor(Color.GRAY, Color.RED)
                .setNavHidden(true)
                //隐藏协议复选框则不会出现二次弹窗
                //.setCheckboxHidden(true)
                .setLogoHidden(true)
                .setSloganHidden(true)
                .setSwitchAccHidden(true)
                .setStatusBarHidden(true)
                .setStatusBarColor(Color.parseColor("#80000000"))

                //单独设置授权页协议文本颜色
                /*.setPrivacyOneColor(Color.RED)
                .setPrivacyTwoColor(Color.BLUE)
                .setPrivacyThreeColor(Color.GRAY)
                .setPrivacyOperatorColor(Color.GREEN)
                //设置授权页运营商协议位置
                .setPrivacyOperatorIndex(2)*/
                //授权页使用自定义字体
                /*.setNavTypeface(createTypeface(mContext,"globalFont.ttf"))
                .setSloganTypeface(createTypeface(mContext,"globalFont.ttf"))
                .setLogBtnTypeface(createTypeface(mContext,"globalFont.ttf"))
                .setSwitchTypeface(createTypeface(mContext,"testFont.ttf"))
                .setProtocolTypeface(createTypeface(mContext,"testFont.ttf"))
                .setNumberTypeface(createTypeface(mContext,"testFont.ttf"))*/
                //授权页使用系统字体
                /*.setNavTypeface(Typeface.SANS_SERIF)
                .setSloganTypeface(Typeface.SERIF)
                .setLogBtnTypeface(Typeface.MONOSPACE)
                .setSwitchTypeface(Typeface.MONOSPACE)
                .setProtocolTypeface(Typeface.MONOSPACE)
                .setNumberTypeface(Typeface.MONOSPACE)*/
                //二次弹窗协议前后缀
                /*.setPrivacyAlertBefore("请阅读")
               .setPrivacyAlertEnd("等协议")*/
                //二次弹窗使用自定义字体
                /*.setPrivacyAlertTitleTypeface(createTypeface(mContext,"globalFont.ttf"))
                .setPrivacyAlertBtnTypeface(createTypeface(mContext,"testFont.ttf"))
                .setPrivacyAlertContentTypeface(createTypeface(mContext,"testFont.ttf"))*/
                //二次弹窗使用系统字体
                /*.setPrivacyAlertTitleTypeface(Typeface.MONOSPACE)
                .setPrivacyAlertBtnTypeface(Typeface.MONOSPACE)
                .setPrivacyAlertBtnTypeface(Typeface.MONOSPACE)*/
                //单独设置二次弹窗协议文本颜色
                /*..setPrivacyAlertOneColor(Color.RED)
                .setPrivacyAlertTwoColor(Color.BLUE)
                .setPrivacyAlertThreeColor(Color.GRAY)
                .setPrivacyAlertOperatorColor(Color.GREEN)*/
                //设置协议展示页webview缓存模式 LOAD_CACHE_ONLY: 不发网络请求资源，只读取缓存。LOAD_NO_CACHE: 不使用缓存，只从网络获取数据。
                //LOAD_CACHE_ELSE_NETWORK:只要本地有，无论是否过期，或者no-cache，都使用缓存中的数据。本地没有缓存时才从网络上获取。
                //.setWebCacheMode(WebSettings.LOAD_NO_CACHE)
                //授权页协议名称系统字体
                //.setProtocolNameTypeface(Typeface.SANS_SERIF)
                //授权页协议名称自定义字体
                //.setProtocolNameTypeface(createTypeface(mContext,"globalFont.ttf"))
                //授权页协议名称是否添加下划线
                //.protocolNameUseUnderLine(true)
                //二次弹窗协议名称系统字体
                //.setPrivacyAlertProtocolNameTypeface(Typeface.SANS_SERIF)
                //二次弹窗协议名称自定义字体
                //.setPrivacyAlertProtocolNameTypeface(createTypeface(mContext,"globalFont.ttf"))
                //二次弹窗协议名称是否添加下划线
                //.privacyAlertProtocolNameUseUnderLine(true)

                .setNumberFieldOffsetX(60)
                .setNumberLayoutGravity(Gravity.LEFT)
                .setNumberSizeDp(24)
                .setNumFieldOffsetY(0)
                .setPrivacyOffsetY_B(20)
                .setPageBackgroundPath("dialog_page_background")
                .setLogBtnOffsetY(logBtnOffsetY)
                .setLogBtnOffsetX(30)
                .setLogBtnMarginLeftAndRight(0)
                .setLogBtnWidth(174)
                .setDialogAlpha(0.5f)
                .setLogBtnLayoutGravity(Gravity.LEFT)
                .setLogBtnHeight(51)
                .setLogBtnBackgroundPath("login_btn_bg")
                .setDialogWidth(dialogWidth)
                .setDialogHeight(dialogHeight)
                //授权页弹窗模式点击非弹窗区域关闭授权页
                //.setTapAuthPageMaskClosePage(true)
                .setDialogBottom(false)
                .setAuthPageActIn("in_activity", "out_activity")
                .setAuthPageActOut("in_activity", "out_activity")
                .setVendorPrivacyPrefix("《")
                .setVendorPrivacySuffix("》")
                .setProtocolGravity(Gravity.CENTER_VERTICAL)
                .setScreenOrientation(authPageOrientation)

                 //二次弹窗属性
                .setPrivacyAlertIsNeedShow(true)
                .setPrivacyAlertIsNeedAutoLogin(true)
                .setPrivacyAlertMaskIsNeedShow(true)
                .setPrivacyAlertAlignment(Gravity.CENTER)
                .setPrivacyAlertBackgroundColor(Color.WHITE)
                .setPrivacyAlertOneColor(Color.BLUE)
                .setPrivacyAlertTwoColor(Color.BLACK)
                .setPrivacyAlertThreeColor(Color.GRAY)
                .setPrivacyAlertOperatorColor(Color.RED)
                .setPrivacyAlertWidth(dialogWidth)
                .setPrivacyAlertHeight(dialogHeight)
                .setPrivacyAlertCornerRadiusArray(new int[]{10,10,10,10})
                .setPrivacyAlertTitleTextSize(15)
                .setPrivacyAlertTitleColor(Color.BLACK)
                .setPrivacyAlertContentTextSize(12)
                .setPrivacyAlertContentColor(Color.GREEN)
                .setPrivacyAlertContentBaseColor(Color.GRAY)
                .setPrivacyAlertContentHorizontalMargin(40)
                .setPrivacyAlertContentAlignment(Gravity.CENTER)
                .setPrivacyAlertContentVerticalMargin(30)
                .setPrivacyAlertBtnTextColor(Color.WHITE)
                .setPrivacyAlertBtnTextColorPath("privacy_alert_btn_color")
                .setPrivacyAlertEntryAnimation("in_activity")
                .setPrivacyAlertExitAnimation("out_activity")

                .create());
    }

    private ImageView createLandDialogPhoneNumberIcon(int leftMargin) {
        ImageView imageView = new ImageView(mContext);
        int size = AppUtils.dp2px(mContext, 23);
        RelativeLayout.LayoutParams layoutParams = new RelativeLayout.LayoutParams(size, size);
        layoutParams.addRule(RelativeLayout.CENTER_VERTICAL, RelativeLayout.TRUE);
        layoutParams.leftMargin = leftMargin;
        imageView.setLayoutParams(layoutParams);
        imageView.setBackgroundResource(R.drawable.phone);
        imageView.setScaleType(ImageView.ScaleType.CENTER);
        return imageView;
    }

    private View createLandDialogCustomSwitchView() {
        View v = LayoutInflater.from(mContext).inflate(R.layout.custom_switch_other, new RelativeLayout(mContext), false);
        RelativeLayout.LayoutParams layoutParams = new RelativeLayout.LayoutParams(RelativeLayout.LayoutParams.MATCH_PARENT,
                RelativeLayout.LayoutParams.WRAP_CONTENT);
        layoutParams.addRule(RelativeLayout.CENTER_VERTICAL, RelativeLayout.TRUE);
        v.setLayoutParams(layoutParams);
        return v;
    }

    @Override
    public void onResume() {
        super.onResume();
        if (mOldScreenOrientation != mActivity.getRequestedOrientation()) {
            mActivity.setRequestedOrientation(mOldScreenOrientation);
        }
    }

    private ImageView initNumberView() {
        ImageView pImageView = new ImageView(mContext);
        pImageView.setImageResource(R.drawable.phone);
        pImageView.setScaleType(ImageView.ScaleType.FIT_XY);
        RelativeLayout.LayoutParams pParams = new RelativeLayout.LayoutParams(dp2px(mContext, 30), dp2px(mContext, 30));
        pParams.setMargins(dp2px(mContext, 30), 0, 0, 0);
        pImageView.setLayoutParams(pParams);
        return pImageView;
    }
}
