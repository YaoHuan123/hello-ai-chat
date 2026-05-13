package com.aliqin.mytel.config;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import android.app.Activity;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.text.TextUtils;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.Toast;

import com.aliqin.mytel.CacheManage;
import com.aliqin.mytel.NativeBackgroundAdapter;
import com.aliqin.mytel.R;
import com.mobile.auth.gatewayauth.AuthRegisterXmlConfig;
import com.mobile.auth.gatewayauth.AuthUIConfig;
import com.mobile.auth.gatewayauth.AuthUIControlClickListener;
import com.mobile.auth.gatewayauth.PhoneNumberAuthHelper;
import com.mobile.auth.gatewayauth.ResultCode;
import com.mobile.auth.gatewayauth.ui.AbstractPnsViewDelegate;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * xml文件方便预览
 * 可以通过addAuthRegisterXmlConfig一次性统一添加授权页的所有自定义view
 */
public class CustomMovConfig extends BaseUIConfig {
    private final String TAG = "CustomMovConfig";
    private CacheManage mCacheManage;
    private ExecutorService mThreadExecutor;
    private NativeBackgroundAdapter nativeBackgroundAdapter;
    public CustomMovConfig(Activity activity, PhoneNumberAuthHelper authHelper) {
        super(activity, authHelper);
        mCacheManage=new CacheManage(activity.getApplication());
        mThreadExecutor=new ThreadPoolExecutor(Runtime.getRuntime().availableProcessors(),
            Runtime.getRuntime().availableProcessors(),
            0, TimeUnit.SECONDS, new ArrayBlockingQueue<Runnable>(10), new ThreadPoolExecutor.CallerRunsPolicy());
        nativeBackgroundAdapter =
            new NativeBackgroundAdapter(mCacheManage, mThreadExecutor, activity, "videoPath"
                , "demo2.mp4");
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
        //sdk默认控件的区域是marginTop50dp
        int designHeight = mScreenHeightDp - 50;
        int unit = designHeight / 10;
        int dialogHeight = (int) (mScreenHeightDp /2f);
        int dialogWidth= (int) (mScreenWidthDp*3/4f);
        mAuthHelper.addAuthRegisterXmlConfig(new AuthRegisterXmlConfig.Builder()
                .setLayout(R.layout.authsdk_widget_custom_layout, new AbstractPnsViewDelegate() {
                    @Override
                    public void onViewCreated(View view) {
                        final FrameLayout fly_container = view.findViewById(R.id.fly_container);
                        nativeBackgroundAdapter.solveView(fly_container, "#3F51B5");
                    }
                })
                .build());
        mAuthHelper.setAuthUIConfig(new AuthUIConfig.Builder()
                .setAppPrivacyOne("《自定义隐私协议》", "https://test.h5.app.tbmao.com/user")
                .setAppPrivacyTwo("《百度》", "https://www.baidu.com")
                .setAppPrivacyColor(Color.GRAY, Color.parseColor("#FFFFFF"))
                .setNavHidden(true)
                .setLogoHidden(true)
                .setSloganHidden(true)
                .setSwitchAccHidden(true)
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
               /* .setNavTypeface(Typeface.SANS_SERIF)
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
                //二次弹窗标题及确认按钮使用自定义字体
                /*.setPrivacyAlertTitleTypeface(Typeface.MONOSPACE)
                .setPrivacyAlertContentTypeface(Typeface.MONOSPACE)
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


                .setPrivacyState(false)
                //注意，如果需要二次弹窗此属性可以不设置或者设置为false
                .setCheckboxHidden(true)
                .setLightColor(true)
                .setNumFieldOffsetY(unit * 6)
                .setLogBtnOffsetY(unit * 7)
                .setWebViewStatusBarColor(Color.TRANSPARENT)
                .setStatusBarColor(Color.TRANSPARENT)
                .setStatusBarUIFlag(View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
                .setWebNavTextSizeDp(20)
                .setNumberSizeDp(20)
                .setNumberColor(Color.parseColor("#FFFFFF"))
                .setAuthPageActIn("in_activity", "out_activity")
                .setAuthPageActOut("in_activity", "out_activity")
                .setVendorPrivacyPrefix("《")
                .setVendorPrivacySuffix("》")
                .setPageBackgroundPath("page_background_color")
                .setLogoImgPath("mytel_app_launcher")
                .setLogBtnBackgroundPath("login_btn_bg")
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

                .create());
    }
}
