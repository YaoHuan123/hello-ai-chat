package com.aliqin.mytel.login;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import android.text.method.ScrollingMovementMethod;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;

import com.aliqin.mytel.BuildConfig;
import com.aliqin.mytel.MessageActivity;
import com.aliqin.mytel.R;
import com.aliqin.mytel.config.BaseUIConfig;
import com.aliqin.mytel.uitls.ExecutorManager;
import com.mobile.auth.gatewayauth.AuthUIConfig;
import com.mobile.auth.gatewayauth.PhoneNumberAuthHelper;
import com.mobile.auth.gatewayauth.ResultCode;
import com.mobile.auth.gatewayauth.TokenResultListener;
import com.mobile.auth.gatewayauth.model.TokenRet;
import com.mobile.auth.gatewayauth.utils.security.PackageUtils;

import static com.aliqin.mytel.Constant.THEME_KEY;
import static com.aliqin.mytel.uitls.MockRequest.getPhoneNumber;

/**
 * 进app直接登录的场景
 */
public class OneKeyLoginActivity extends Activity {
    private static final String TAG = OneKeyLoginActivity.class.getSimpleName();

    private EditText mTvResult;
    private PhoneNumberAuthHelper mPhoneNumberAuthHelper;
    private TokenResultListener mTokenResultListener;
    private ProgressDialog mProgressDialog;
    private int mUIType;
    private BaseUIConfig mUIConfig;
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mUIType = getIntent().getIntExtra(THEME_KEY, -1);
        setContentView(R.layout.activity_login);
        mTvResult = findViewById(R.id.tv_result);
        sdkInit(BuildConfig.AUTH_SECRET);
        mUIConfig = BaseUIConfig.init(mUIType, this, mPhoneNumberAuthHelper);
        oneKeyLogin();
        mTvResult.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                mTvResult.setTextIsSelectable(true);
                mTvResult.setSelectAllOnFocus(true);
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
               // 创建普通字符型ClipData
                ClipData mClipData = ClipData.newPlainText("Label", mTvResult.getText());
               // 将ClipData内容放到系统剪贴板里。
                cm.setPrimaryClip(mClipData);
                Toast.makeText(OneKeyLoginActivity.this,"登录token已复制",Toast.LENGTH_SHORT).show();
                return false;
            }
        });
    }


    public void sdkInit(String secretInfo) {
        mTokenResultListener = new TokenResultListener() {
            @Override
            public void onTokenSuccess(String s) {
                hideLoadingDialog();
                if(BuildConfig.NeedLogger){
                    Log.e(TAG, "获取token成功：" + s);
                }
                TokenRet tokenRet = null;
                try {
                    tokenRet = TokenRet.fromJson(s);
                    if (ResultCode.CODE_START_AUTHPAGE_SUCCESS.equals(tokenRet.getCode())) {
                        if(BuildConfig.NeedLogger){
                            Log.i(TAG, "唤起授权页成功：" + s);
                        }
                    }

                    if (ResultCode.CODE_SUCCESS.equals(tokenRet.getCode())) {
                        if(BuildConfig.NeedLogger){
                            Log.i(TAG, "获取token成功：" + s);
                        }
                        getResultWithToken(tokenRet.getToken());
                        mPhoneNumberAuthHelper.setAuthListener(null);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            @Override
            public void onTokenFailed(String s) {
                if(BuildConfig.NeedLogger){
                    Log.e(TAG, "获取token失败：" + s);
                }
                hideLoadingDialog();
                mPhoneNumberAuthHelper.hideLoginLoading();
                TokenRet tokenRet = null;
                try {
                    tokenRet = TokenRet.fromJson(s);
                    /*if (ResultCode.CODE_ERROR_USER_CANCEL.equals(tokenRet.getCode())) {
                        //模拟的是必须登录 否则直接退出app的场景
                        finish();
                    } else {

                        Toast.makeText(getApplicationContext(), "一键登录失败切换到其他登录方式", Toast.LENGTH_SHORT).show();
                        Intent pIntent = new Intent(OneKeyLoginActivity.this, MessageActivity.class);
                        startActivityForResult(pIntent, 1002);
                    }*/
                } catch (Exception e) {
                    e.printStackTrace();
                }
                /*mPhoneNumberAuthHelper.quitLoginPage();
                mPhoneNumberAuthHelper.setAuthListener(null);*/
            }
        };
        mPhoneNumberAuthHelper = PhoneNumberAuthHelper.getInstance(this, mTokenResultListener);
        mPhoneNumberAuthHelper.getReporter().setLoggerEnable(BuildConfig.NeedLogger);
        mPhoneNumberAuthHelper.setAuthSDKInfo(secretInfo);
    }

    /**
     * 进入app就需要登录的场景使用
     */
    private void oneKeyLogin() {
        mPhoneNumberAuthHelper = PhoneNumberAuthHelper.getInstance(getApplicationContext(), mTokenResultListener);
        mPhoneNumberAuthHelper.checkEnvAvailable();
        mUIConfig.configAuthPage();
        //用户控制返回键及左上角返回按钮效果
        mPhoneNumberAuthHelper.userControlAuthPageCancel();
        //用户禁用utdid
        //mPhoneNumberAuthHelper.prohibitUseUtdid();
        //授权页是否跟随系统深色模式
        mPhoneNumberAuthHelper.setAuthPageUseDayLight(true);
        //授权页物理返回键禁用
        //mPhoneNumberAuthHelper.closeAuthPageReturnBack(true);
        //横屏水滴屏全屏适配
        mPhoneNumberAuthHelper.keepAuthPageLandscapeFullSreen(true);
        //sdk内置所有界面隐藏底部导航栏
        mPhoneNumberAuthHelper.keepAllPageHideNavigationBar();
        //授权页扩大协议按钮选择范围至我已阅读并同意
        mPhoneNumberAuthHelper.expandAuthPageCheckedScope(true);
        //弹窗式授权页在软键盘出现时自动调整位置
        //mPhoneNumberAuthHelper.updateDialogWithKeyboard();
        getLoginToken(5000);
    }

    /**
     * 拉起授权页
     * @param timeout 超时时间
     */
    public void getLoginToken(int timeout) {
        /*for (int i = 0; i < 2; i++) {
            mPhoneNumberAuthHelper.getLoginToken(this, timeout);
        }*/
        mPhoneNumberAuthHelper.getLoginToken(this, timeout);
        showLoadingDialog("正在唤起授权页");
    }


    public void getResultWithToken(final String token) {
        ExecutorManager.run(new Runnable() {
            @Override
            public void run() {
                final String result = getPhoneNumber(token);
                OneKeyLoginActivity.this.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        mTvResult.setText("登陆成功：" + result);
                        mTvResult.setMovementMethod(ScrollingMovementMethod.getInstance());
                        mPhoneNumberAuthHelper.quitLoginPage();
                    }
                });
            }
        });
    }



    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 1002) {
            if (resultCode == 1) {
                mTvResult.setText("登陆成功：" + data.getStringExtra("result"));
                mTvResult.setMovementMethod(ScrollingMovementMethod.getInstance());
            } else {
                //模拟的是必须登录 否则直接退出app的场景
                finish();
            }
        }
    }



    public void showLoadingDialog(String hint) {
        if (mProgressDialog == null) {
            mProgressDialog = new ProgressDialog(this);
            mProgressDialog.setProgressStyle(ProgressDialog.STYLE_SPINNER);
        }
        mProgressDialog.setMessage(hint);
        mProgressDialog.setCancelable(true);
        mProgressDialog.show();
    }

    public void hideLoadingDialog() {
        if (mProgressDialog != null) {
            mProgressDialog.dismiss();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        mUIConfig.onResume();
    }
}
