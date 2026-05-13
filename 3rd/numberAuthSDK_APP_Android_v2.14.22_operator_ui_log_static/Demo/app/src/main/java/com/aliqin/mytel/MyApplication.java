package com.aliqin.mytel;

import android.app.Application;
import android.util.Log;

import com.mobile.auth.gatewayauth.PhoneNumberAuthHelper;
import com.mobile.auth.gatewayauth.TokenResultListener;
import com.aliqin.mytel.BuildConfig;

public class MyApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        /*建议提前进行sdk初始化，减少流程耗时*/
        final PhoneNumberAuthHelper authHelper = PhoneNumberAuthHelper.getInstance(this, new TokenResultListener() {
            @Override
            public void onTokenSuccess(String ret) {
            }

            @Override
            public void onTokenFailed(String ret) {
            }
        });
        authHelper.getReporter().setLoggerEnable(true);
        authHelper.setAuthSDKInfo(BuildConfig.AUTH_SECRET);
    }

}
