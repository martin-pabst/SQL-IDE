import { ajax } from "../communication/AjaxHelper.js";
import { getUserDisplayName, LoginRequest, LoginResponse, LogoutRequest, UserData } from "../communication/Data.js";
import { Main } from "./Main.js";
import { Helper } from "./gui/Helper.js";
import { userInfo } from "os";
import { UserMenu } from "./gui/UserMenu.js";
import { escapeHtml } from "../tools/StringTools.js";
import { PushClientManager } from "../communication/pushclient/PushClientManager.js";
import { AutoLogout } from "./AutoLogout.js";
import { setCookie } from "../tools/HttpTools.js";


export class Login {

    loggedInWithVidis: boolean = false;

    constructor(private main: Main) {
        new AutoLogout(this);
    }

    loginWithVidis(singleUseToken: string) {
        this.loggedInWithVidis = true;
        jQuery('#login').hide();
        jQuery('#main').css('visibility', 'visible');

        jQuery('#bitteWartenText').html('Bitte warten ...');
        jQuery('#bitteWarten').css('display', 'flex');
        this.sendLoginRequest(singleUseToken);
    }

    initGUI() {

        let $loginSpinner = jQuery('#login-spinner>img');

        jQuery('#login-username').focus();

        jQuery('#login-username').on('keydown', (e) => {
            if (e.key == "Enter") {
                jQuery('#login-password').focus();
            }
        });

        jQuery('#login-password').on('keydown', (e) => {
            if (e.key == "Enter") {
                jQuery('#login-button').trigger('click');
            }
        });

        jQuery('#login-password').on('keydown', (e) => {
            if (e.key == "Tab") {
                e.preventDefault();
                jQuery('#login-button').focus();
                jQuery('#login-button').addClass('jo_active');
            }
            if (e.key == "Enter") {
                jQuery('#login-button').trigger('click');
            }
        });

        jQuery('#login-button').on('keydown', (e) => {
            if (e.key == "Tab") {
                e.preventDefault();
                jQuery('#login-username').focus();
                jQuery('#login-button').removeClass('jo_active');
            } else {
                jQuery('#login-button').trigger('click');
            }
        });

        // Avoid double login when user does doubleclick:
        let loginHappened = false;
        jQuery('#login-button').on('click', () => {

            $loginSpinner.show();

            if (loginHappened) return;
            loginHappened = true;

            setTimeout(() => {
                loginHappened = false;
            }, 1000);


            this.sendLoginRequest();

        });

        jQuery('#buttonLogout').on('click', () => {

            this.logout();
        });


    }

    logout() {
        this.main.waitOverlay.show('Bitte warten, der letzte Bearbeitungsstand wird noch gespeichert ...');

        if (this.main.workspacesOwnerId != this.main.user.id) {
            this.main.projectExplorer.onHomeButtonClicked();
        }

        PushClientManager.getInstance().close();

        this.main.networkManager.sendUpdates(() => {

            this.main.notifier.connect(null);

            let logoutRequest: LogoutRequest = {
                currentWorkspaceId: this.main.currentWorkspace?.id
            }

            this.main.networkManager.sendUpdateUserSettings(() => {

                ajax('logout', logoutRequest, () => {
                    // window.location.href = 'index.html';

                    if (this.loggedInWithVidis) {
                        // window.location.assign("https://aai-test.vidis.schule/auth/realms/vidis/protocol/openid-connect/logout?ID_TOKEN_HINT=" + this.main.user.vidis_sub + "&post_logout_redirect_uri=https%3A%2F%2Fwww.sql-ide.de");
                        window.location.assign("https://aai.vidis.schule/auth/realms/vidis/protocol/openid-connect/logout?ID_TOKEN_HINT=" + this.main.user.vidis_sub + "&post_logout_redirect_uri=https%3A%2F%2Fwww.sql-ide.de");
                    } else {
                        jQuery('#login').show();
                        this.main.waitOverlay.hide();
                        jQuery('#login-message').empty();
                        this.main.getMonacoEditor().setModel(monaco.editor.createModel("", "myJava"));
                        this.main.projectExplorer.fileListPanel.clear();
                        this.main.projectExplorer.workspaceListPanel.clear();

                        this.main.databaseExplorer.clear();
                        this.main.resultsetPresenter.clear();

                        if (this.main.user.is_teacher) {
                            this.main.teacherExplorer.removePanels();
                            this.main.teacherExplorer = null;
                        }


                        this.main.currentWorkspace = null;
                        this.main.user = null;
                    }



                });


            });

        }, true);

    }


    sendLoginRequest(singleUseToken?: string) {

        let that = this;
        let $loginSpinner = jQuery('#login-spinner>img');
        $loginSpinner.show();

        let loginRequest: LoginRequest = {
            username: <string>jQuery('#login-username').val(),
            password: <string>jQuery('#login-password').val(),
            language: 1
        }

        ajax('login' + (singleUseToken ? ('?singleUseToken=' + singleUseToken) : ''), loginRequest, (response: LoginResponse) => {

            if (!response.success) {
                jQuery('#login-message').html('Fehler: Benutzername und/oder Passwort ist falsch.');
            } else {

                PushClientManager.getInstance().open();

                // We don't do this anymore for security reasons - see AjaxHelper.ts
                // Alternatively we now set a long expiry interval for cookie.
                // credentials.username = loginRequest.username;
                // credentials.password = loginRequest.password;

                jQuery('#login').hide();

                this.main.waitOverlay.show('Bitte warten...');

                let user: UserData = response.user;
                if (user.settings == null || user.settings.helperHistory == null) {
                    user.settings = {
                        helperHistory: {
                        },
                        viewModes: null,
                        classDiagram: null
                    }
                }

                this.main.waitForGUICallback = () => {

                    let user: UserData = response.user;

                    that.main.mainMenu.initGUI(user);

                    that.main.waitOverlay.hide();
                    $loginSpinner.hide();
                    jQuery('#menupanel-username').html(getUserDisplayName(user));

                    new UserMenu(that.main).init();

                    if (user.is_teacher) {
                        that.main.initTeacherExplorer(response.classdata);
                    }

                    that.main.user = user;

                    that.main.restoreWorkspaces(response.workspaces);
                    that.main.workspacesOwnerId = user.id;

                    that.main.networkManager.initializeTimer();

                    that.main.projectExplorer.fileListPanel.setFixed(!user.is_teacher);
                    that.main.projectExplorer.workspaceListPanel.setFixed(!user.is_teacher);

                    that.main.viewModeController.initViewMode();
                    that.main.bottomDiv.hideHomeworkTab();

                    that.main.networkManager.initializeSSE();

                }

                if (this.main.startupComplete == 0) {
                    this.main.waitForGUICallback();
                    this.main.waitForGUICallback = null;
                }

            }

        }, (errorMessage: string) => {
            jQuery('#login-message').html('Login gescheitert: ' + errorMessage);
            jQuery('#login-spinner>img').hide();
        }
        );

    }

}