package com.aliqin.mytel.config;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.text.TextUtils;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.Toast;

import com.aliqin.mytel.MessageActivity;
import com.aliqin.mytel.R;
import com.mobile.auth.gatewayauth.AuthRegisterViewConfig;
import com.mobile.auth.gatewayauth.AuthRegisterXmlConfig;
import com.mobile.auth.gatewayauth.AuthUIConfig;
import com.mobile.auth.gatewayauth.AuthUIControlClickListener;
import com.mobile.auth.gatewayauth.CustomInterface;
import com.mobile.auth.gatewayauth.PhoneNumberAuthHelper;
import com.mobile.auth.gatewayauth.ResultCode;
import com.mobile.auth.gatewayauth.ui.AbstractPnsViewDelegate;
import com.nirvana.tools.core.AppUtils;

import org.json.JSONException;
import org.json.JSONObject;

public class DialogPortConfig extends BaseUIConfig {
    private final String TAG = "DialogPortConfig";
    /**
     * 应用包名
     */
    private String mPackageName;

    public DialogPortConfig(Activity activity, PhoneNumberAuthHelper authHelper) {
        super(activity, authHelper);
        mPackageName = AppUtils.getPackageName(activity);
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
        int authPageOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT;
        if (Build.VERSION.SDK_INT == 26) {
            authPageOrientation = ActivityInfo.SCREEN_ORIENTATION_BEHIND;
        }
        updateScreenSize(authPageOrientation);
        int dialogWidth = (int) (mScreenWidthDp * 0.8f);
        int dialogHeight = (int) (mScreenHeightDp * 0.65f) - 50;
        int unit = dialogHeight / 10;
        int logBtnHeight = (int) (unit * 1.2);

        mAuthHelper.addAuthRegistViewConfig("switch_msg", new AuthRegisterViewConfig.Builder()
                .setView(initSwitchView(unit * 6))
                .setRootViewId(AuthRegisterViewConfig.RootViewId.ROOT_VIEW_ID_BODY)
                .setCustomInterface(new CustomInterface() {
                    @Override
                    public void onClick(Context context) {
                        Toast.makeText(mContext, "切换到短信登录方式", Toast.LENGTH_SHORT).show();
                        Intent pIntent = new Intent(mActivity, MessageActivity.class);
                        mActivity.startActivityForResult(pIntent, 1002);
                        mAuthHelper.quitLoginPage();
                    }
                })
                .build());

        /*mAuthHelper.addAuthRegistViewConfig("input_msg", new AuthRegisterViewConfig.Builder()
                .setView(initInputView(unit * 3))
                .setRootViewId(AuthRegisterViewConfig.RootViewId.ROOT_VIEW_ID_BODY)
                .build());*/

        mAuthHelper.addAuthRegisterXmlConfig(new AuthRegisterXmlConfig.Builder()
                .setLayout(R.layout.custom_port_dialog_action_bar, new AbstractPnsViewDelegate() {
                    @Override
                    public void onViewCreated(View view) {
                        findViewById(R.id.btn_close).setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
                                mAuthHelper.quitLoginPage();
                            }
                        });
                    }
                })
                .build());
        mAuthHelper.setAuthUIConfig(new AuthUIConfig.Builder()
                .setPrivacyBefore("已阅读并同意")
                .setAppPrivacyOne("《自定义隐私协议》", "https://www.baidu.com")
                .setAppPrivacyTwo("《自定义隐私协议》2","https://baijiahao.baidu.com/s?id=1693920988135022454&wfr=spider&for=pc")
                .setAppPrivacyColor(Color.GRAY, Color.parseColor("#EB4174"))
                .setPrivacyConectTexts(new String[]{"和"})
                .setPrivacyOperatorIndex(2)
                .setPrivacyState(false)
                .setPrivacyTextSize(8)
                .setPrivacyOffsetY(125)
//                .setCheckboxHidden(true)
                .setNavHidden(true) //设置默认导航栏是否隐藏
                .setSwitchAccHidden(true)
                .setNavReturnHidden(true) //设置导航栏返回按钮隐藏
                .setDialogBottom(false)
                //自定义协议页跳转协议，需要在清单文件配置自定义intent-filter，不需要自定义协议页，则请不要配置ProtocolAction
//                .setProtocolAction("com.aliqin.mytel.protocolWeb")
//                .setPackageName( AppUtils.getPackageName(ShunChenCenterSDK.getActivity()))
//                .setNavColor(Color.TRANSPARENT)
//                .setWebNavColor(Color.BLUE)
                .setLogoHidden(true)
                .setLogoOffsetY(0)
                .setLogoWidth(135)
                .setLogoHeight(38)
               .setLogoImgPath("mytel_app_launcher")

                .setNumFieldOffsetY(35) //相对顶部的垂直距离
                //设置字体大小，以Dp为单位，不同于Sp，不会随着系统字体变化而变化
                .setNumberSizeDp(20)

                .setLogBtnOffsetY(65)
                .setLogBtnWidth(200)
                .setLogBtnMarginLeftAndRight(15)
                .setLogBtnHeight(45)
                .setLogBtnTextSizeDp(16)
                .setLogBtnText("一键登录")
               .setLogBtnBackgroundPath("login_btn_bg")


                //去除
                .setSloganText(" ")
//                .setSloganOffsetY(40)
                .setPageBackgroundPath("dialog_page_background")

                .setDialogWidth(dialogWidth)
                .setDialogHeight(dialogHeight)
                .setScreenOrientation(authPageOrientation)
                .create());

       /* mAuthHelper.setAuthUIConfig(new AuthUIConfig.Builder()
                .setPrivacyBefore("阅读同意")
                .setAppPrivacyOne("《自定义隐私协议》", "https://www.baidu.com")
                .setAppPrivacyTwo("《自定义隐私协议》2","https://baijiahao.baidu.com/s?id=1693920988135022454&wfr=spider&for=pc")
                .setAppPrivacyThree("《自定义隐私协议》3","http://www.npc.gov.cn/zgrdw/npc/cwhhy/13jcwh/node_35014.htm")
                .setAppPrivacyColor(Color.GRAY, Color.parseColor("#002E00"))
                .setPrivacyConectTexts(new String[]{",","","和"})
                .setPrivacyOperatorIndex(2)
                .setPrivacyState(false)
                //隐藏协议复选框则不会出现二次弹窗
                //.setCheckboxHidden(true)
                .setNavHidden(true)
                .setSwitchAccHidden(true)
                .setNavReturnHidden(true)
                .setDialogBottom(false)
                *//*.setDialogOffsetY(10)
                .setDialogOffsetX(30)*//*


                //单独设置授权页协议文本颜色
                *//*.setPrivacyOneColor(Color.RED)
                .setPrivacyTwoColor(Color.BLUE)
                .setPrivacyThreeColor(Color.GRAY)
                .setPrivacyOperatorColor(Color.GREEN)
                //设置授权页运营商协议位置
                .setPrivacyOperatorIndex(2)*//*
                //授权页使用自定义字体
                //授权页使用自定义字体
               *//* .setNavTypeface(createTypeface(mContext,"globalFont.ttf"))
                .setSloganTypeface(createTypeface(mContext,"globalFont.ttf"))
                .setLogBtnTypeface(createTypeface(mContext,"globalFont.ttf"))
                .setSwitchTypeface(createTypeface(mContext,"testFont.ttf"))
                .setProtocolTypeface(createTypeface(mContext,"testFont.ttf"))
                .setNumberTypeface(createTypeface(mContext,"testFont.ttf"))*//*
                //授权页使用系统字体
                *//*.setNavTypeface(Typeface.SANS_SERIF)
                .setSloganTypeface(Typeface.SERIF)
                .setLogBtnTypeface(Typeface.MONOSPACE)
                .setSwitchTypeface(Typeface.MONOSPACE)
                .setProtocolTypeface(Typeface.MONOSPACE)
                .setNumberTypeface(Typeface.MONOSPACE)*//*
                //二次弹窗协议前后缀
                *//*.setPrivacyAlertBefore("请阅读")
               .setPrivacyAlertEnd("等协议")*//*
                //二次弹窗使用自定义字体
                *//*.setPrivacyAlertTitleTypeface(createTypeface(mContext,"globalFont.ttf"))
                .setPrivacyAlertBtnTypeface(createTypeface(mContext,"testFont.ttf"))
                .setPrivacyAlertContentTypeface(createTypeface(mContext,"testFont.ttf"))*//*
                //二次弹窗使用系统字体
                *//*.setPrivacyAlertTitleTypeface(Typeface.MONOSPACE)
                .setPrivacyAlertBtnTypeface(Typeface.MONOSPACE)
                .setPrivacyAlertBtnTypeface(Typeface.MONOSPACE)*//*
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

                //自定义协议页跳转协议，需要在清单文件配置自定义intent-filter，不需要自定义协议页，则请不要配置ProtocolAction
                .setProtocolAction("com.aliqin.mytel.protocolWeb")
                .setPackageName(mPackageName)
                .setNavColor(Color.TRANSPARENT)
                .setWebNavColor(Color.BLUE)

                .setLogoOffsetY(0)
                .setLogoWidth(42)
                .setLogoHeight(42)
                .setLogoImgPath("mytel_app_launcher")

                .setNumFieldOffsetY(unit + 10)
                //设置字体大小，以Dp为单位，不同于Sp，不会随着系统字体变化而变化
                .setNumberSizeDp(17)

                .setLogBtnWidth(dialogWidth - 30)
                .setLogBtnMarginLeftAndRight(15)
                .setLogBtnHeight(logBtnHeight)
                .setLogBtnTextSizeDp(16)
                .setLogBtnBackgroundPath("login_btn_bg")

                .setLogBtnOffsetY(unit * 4)
                .setSloganText("为了您的账号安全，请先绑定手机号")
                .setSloganOffsetY(unit * 3)
                .setSloganTextSizeDp(11)

                .setPageBackgroundPath("dialog_page_background")

                .setAuthPageActIn("in_activity", "out_activity")
                .setAuthPageActOut("in_activity", "out_activity")
                .setVendorPrivacyPrefix("《")
                .setVendorPrivacySuffix("》")
                .setDialogWidth(dialogWidth)
                .setDialogHeight(dialogHeight)
                //授权页弹窗模式点击非弹窗区域关闭授权页
                .setTapAuthPageMaskClosePage(true)
                .setScreenOrientation(authPageOrientation)

                //单独设置二次弹窗协议文本颜色
                *//*..setPrivacyAlertOneColor(Color.RED)
                .setPrivacyAlertTwoColor(Color.BLUE)
                .setPrivacyAlertThreeColor(Color.GRAY)
                .setPrivacyAlertOperatorColor(Color.GREEN)*//*
                //设置协议展示页webview缓存模式 LOAD_CACHE_ONLY: 不发网络请求资源，只读取缓存。LOAD_NO_CACHE: 不使用缓存，只从网络获取数据。
                //LOAD_CACHE_ELSE_NETWORK:只要本地有，无论是否过期，或者no-cache，都使用缓存中的数据。本地没有缓存时才从网络上获取。
                //.setWebCacheMode(WebSettings.LOAD_NO_CACHE)
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
                .create());*/
    }
}
