/** jQuery Initialisation **/
(function ($) {
    $(function () {
    }); // end of document ready
})(jQuery); // end of jQuery name space

function toggle_visibility(id) {
    const e = document.getElementById(id);
    e.classList.remove('may-be-hidden');
}

function hide(id) {
    const e = document.getElementById(id);
    e.classList.add('may-be-hidden');
}

async function fetchApi({
    uri,
    method = "GET",
    headers = { "Content-Type": "application/json", 'Accept': 'application/json' },
    body,
    onSuccess, // res => {} (executed if status >= 200 && < 300)
    onStatus = {}, // {status: (res) => {}}
}) {
    try {
        const res = await fetch(uri, { method, headers, body });
        res.data = await res.json();

        if (res.ok) {
            await onSuccess?.(res);
        } else if (res.data?.code === 'REDIRECT') {
            if(res.data.path == "/login") {
                window.alert("Session expirée. Veuillez vous reconnecter.")
            }
            return document.location.replace(res.data.path); // redirect to res.data.path (/login or /forbidden)
        } else if (onStatus[res.status]) {
            await onStatus[res.status](res);
        } else {
            const err = new Error(JSON.stringify({ status: res.status, data: res.data }));
            err.res = res;
            throw err;
        }
        return res;
    } catch (err) {
        console.error(err.res?.url || uri, err);
        throw err;
    }
}

/** base64url helper functions **/
/**
* Convert from a Base64URL-encoded string to an Array Buffer. Best used when converting a
* credential ID from a JSON string to an ArrayBuffer, like in allowCredentials or
* excludeCredentials
*
* Helper method to compliment `bufferToBase64URLString`
*/
function base64URLStringToBuffer(base64URLString) {
    // Convert from Base64URL to Base64
    const base64 = base64URLString.replace(/-/g, '+').replace(/_/g, '/');
    /**
     * Pad with '=' until it's a multiple of four
     * (4 - (85 % 4 = 1) = 3) % 4 = 3 padding
     * (4 - (86 % 4 = 2) = 2) % 4 = 2 padding
     * (4 - (87 % 4 = 3) = 1) % 4 = 1 padding
     * (4 - (88 % 4 = 0) = 4) % 4 = 0 padding
     */
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padLength, '=');

    // Convert to a binary string
    const binary = atob(padded);

    // Convert binary string to buffer
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return buffer;
}

/**
* Convert the given array buffer into a Base64URL-encoded string. Ideal for converting various
* credential response ArrayBuffers to string for sending back to the server as JSON.
*
* Helper method to compliment `base64URLStringToBuffer`
*
* source: https://github.com/MasterKale/SimpleWebAuthn/blob/master/packages/browser/src/helpers/bufferToBase64URLString.ts
*/
function bufferToBase64URLString(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';

    for (const charCode of bytes) {
        str += String.fromCharCode(charCode);
    }

    const base64String = btoa(str);

    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function getImgWithAltText({ qrCodeImg, qrCodeSrc, alt = "QR code Esup Auth" }) {
    if (!qrCodeSrc) {
        if (qrCodeImg) {
            // extract src from img
            qrCodeSrc = new DOMParser().parseFromString(qrCodeImg, 'text/html').querySelector('img')?.src;
        } else {
            return "";
        }
    }
    return `<img src="${qrCodeSrc}" alt="${alt}">`;
}

function toast({ message, displayLength = 9 /*seconds*/ * 1000, className }) {
    Materialize.toast(message, displayLength, className);
    $('.toast').last().attr('role', 'alert');
}

/** Vue.JS **/

/** User **/
const PushMethod = {
    props: {
        'user': Object,
        'getAndSetUser': Function,
        'messages': Object,
        'infos': Object,
        'activate': Function,
        'deactivate': Function,
    },
    data() {
        return {
            'socket': Object,
        };
    },
    watch: {
        'user.uid': {
            handler(uid, old, onCleanup) {
                this.cleanupSocket();

                this.socket = io.connect({ reconnect: true, path: "/sockets", query: 'uid=' + uid });
                this.socket.on('userPushActivate', () => {
                    this.getAndSetUser(uid);
                });

                this.socket.on('userPushDeactivate', () => {
                    this.getAndSetUser(uid);
                });

                onCleanup(() => {
                    this.cleanupSocket();
                })
            },
            immediate: true,
        },
    },
    methods: {
        cleanupSocket: function() {
            this.socket?.disconnect?.();
            delete this.socket;
        }
    },
    template: '#push-method'
};

const BypassMethod = {
    props: {
        'user': Object,
        'generate_bypass': Function,
        'activate': Function,
        'deactivate': Function,
        'messages': Object,
        'infos': Object,
    },
    computed: {
        generationDateString() {
            const date = new Date(this.user.methods.bypass.generation_date);
            return date.toLocaleDateString(this.infos.lang || "en", dateTimeFormatOptions)
        },
    },
    template: '#bypass-method'
};

const dateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
};

const PasscodeGridMethod = {
    props: {
        'user': Object,
        'generate_passcode_grid': Function,
        'activate': Function,
        'deactivate': Function,
        'messages': Object,
        'infos': Object,
    },
    computed: {
        generationDateString() {
            const date = new Date(this.user.methods.passcode_grid.generation_date);
            return date.toLocaleDateString(this.infos.lang || "en", dateTimeFormatOptions)
        },
    },
    template: '#passcode_grid-method'
};

const TotpMethod = {
    props: {
        'user': Object,
        'generate_totp': Function,
        'activate': Function,
        'deactivate': Function,
        'messages': Object,
        'infos': Object,
        'formatApiUri': Function,
    },
    computed: {
        EsupAuth() {
            if (!this.infos.mobile) {
                return this.infos.esup_auth_download_link;
            }
            return `<a href="${this.infos.EsupAuth[this.infos.mobile]}" target="_blank">Esup Auth</a>`;
        },
        authentificators() {
            const authenticatorApps = [
                { name: "Google Authenticator", android: "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2", ios: "https://apps.apple.com/fr/app/google-authenticator/id388497605" },
                { name: "Microsoft Authenticator", android: "https://play.google.com/store/apps/details?id=com.azure.authenticator", ios: "https://apps.apple.com/fr/app/microsoft-authenticator/id983156458" },
                { name: this.messages.api.methods.totp.apple_passwords_app, ios: "apple-otpauth://totp/" },
                { name: "FreeOTP", android: "https://play.google.com/store/apps/details?id=org.fedorahosted.freeotp", ios: "https://apps.apple.com/us/app/freeotp-authenticator/id872559395" },
                { name: "Aegis Authenticator", android: "https://play.google.com/store/apps/details?id=com.beemdevelopment.aegis" },
            ];
            if(!this.infos.mobile) {
                return `${this.infos.esup_auth_download_link}, ${authenticatorApps.map(app => app.name).join(", ")}, ...`;
            }
            authenticatorApps.unshift(this.infos.EsupAuth);
            return authenticatorApps
                .map(app => ({ name: app.name, url: app[this.infos.mobile] }))
                .filter(app => app.url)
                .map(app => `<a href="${app.url}" target="_blank">${app.name}</a>`)
                .join(", ")
                .concat(", ...");
        }
    },
    methods: {
        validate: function() {
            const totpCode = this.user.methods.totp.validation_code;
            this.user.methods.totp.validation_code = '';
            return fetchApi({
                method: "POST",
                uri: this.formatApiUri("/totp/activate/confirm/" + totpCode),
                onSuccess: res => {
                    if (res.data.code != "Ok") {
                        toast({ message: 'Erreur, veuillez réessayer.', className: 'red darken-1' });
                    } else {
                        this.user.methods.totp.askActivation = false;
                        this.user.methods.totp.qrCode = '';
                        this.user.methods.totp.message = '';
                        toast({ message: 'Code validé', className: 'green contrasted' });
                    }
                },
                onStatus: {
                    401: res => {
                        toast({ message: this.messages.api.methods.random_code.verify_code.wrong, className: 'red darken-1' });
                    }
                }
            });
        }
    },
    template: '#totp-method'
};

const WebAuthnMethod = {
    props: {
        'user': Object,
        'activate': Function,
        'deactivate': Function,
        'messages': Object,
        'infos': Object,
        'formatApiUri': Function,
        'fetchWebauthnData': Function,
    },
    data() {
        return {
            webauthnData: { // example (will be override by mounted() )
                nonce: "",
                auths: [], // [{credentialID: "", credentialPublicKey: "", counter: 0, name: ""}],
                user_id: "",
                rp: { "name": "Univ", "id": "univ.fr" },
                pubKeyTypes: [{ "type": "public-key", "alg": -  7 }],
            },
            registrationInProgress: false,
        }
    },
    async mounted() {
        await this.updateWebauthnData();
    },
    computed: {
        descriptionMessage() {
            switch (this.webauthnData.auths.length) {
                case 0:
                    return this.messages.api.methods.webauthn.no_authentificators;
                case 1:
                    return this.messages.api.methods.webauthn.single_auth;
                default:
                    return this.messages.api.methods.webauthn.nb_of_auths.replace('%NB%', this.webauthnData.auths.length);
            }
        },
    },
    watch: {
        'user.uid': function(newUid, oldUid) {
            if (newUid !== oldUid) {
                this.updateWebauthnData();
            }
        },
        'webauthnData.auths.length': {
            handler(lenght) {
                this.user.methods.webauthn.askActivation = !lenght
            },
            immediate: true,
        },
    },
    methods: {
        updateWebauthnData: async function() {
            this.webauthnData = await this.fetchWebauthnData();
            return this.webauthnData;
        },
        getAuthById: function (id) {
            return this.webauthnData.auths.find(authenticator => authenticator.credentialID === id);
        },
        renameAuthenticator: function(authCredID) {
            const auth = this.getAuthById(authCredID);
            const previousName = auth.name;
            return Swal.fire({ // https://sweetalert2.github.io/#configuration
                title: this.messages.api.action.rename + ' ' + previousName,
                input: "text",
                icon: "question",
                inputPlaceholder: this.messages.api.methods.webauthn.new_name,
                inputValue: previousName,
                customClass: { // https://sweetalert2.github.io/#customClass
                    input: "webauthn-factor-rename-input",
                    confirmButton: "waves-effect waves-light btn green contrasted",
                    cancelButton: "waves-effect waves-light btn red darken-1",
                },
                showCancelButton: true,
                allowOutsideClick: false,
                inputValidator: (newName) => {
                    if (!newName.trim()) {
                        return this.messages.error.webauthn.registration_failed;
                    }
                },
                showLoaderOnConfirm: true,
                preConfirm: async (newName) => {
                    if (previousName == newName) {
                        return;
                    }

                    let statusCode;

                    try {
                        const res = await fetchApi({
                            method: "POST",
                            uri: this.formatApiUri("/webauthn/auth/" + authCredID),
                            body: JSON.stringify({
                                name: newName
                            }),
                        });
                        await this.updateWebauthnData();
                        statusCode = res.status;
                    } catch (e) {
                        console.error(e);
                    }

                    if (statusCode == 200) {
                        toast({ message: this.messages.success.webauthn.renamed, className: 'green contrasted' });
                    } else {
                        toast({ message: this.messages.error.webauthn.generic, className: 'red darken-1' });
                    }

                }
            });
        },

        deleteAuthenticator: function(authCredID) {
            const auth = this.getAuthById(authCredID);
            const name = auth.name;
            return Swal.fire({ // https://sweetalert2.github.io/#configuration
                title: this.messages.api.action.webauthn.confirm_delete.replace("%NAME%", name),
                icon: "warning",
                customClass: { // https://sweetalert2.github.io/#customClass
                    confirmButton: "waves-effect waves-light btn red darken-1",
                    cancelButton: "waves-effect waves-light btn green contrasted",
                },
                focusDeny: true,
                reverseButtons: true,
                showCancelButton: true,
                allowOutsideClick: true,
                showLoaderOnConfirm: true,
                preConfirm: async () => {
                    let statusCode;

                    try {
                        const res = await fetchApi({
                            method: "DELETE",
                            uri: this.formatApiUri("/webauthn/auth/" + authCredID),
                        });
                        await this.updateWebauthnData();
                        statusCode = res.status;
                    } catch (e) {
                        console.error(e);
                    }

                    if (statusCode == 200) {
                        toast({ message: this.messages.success.webauthn.deleted, className: 'green contrasted' });
                    } else {
                        toast({ message: this.messages.error.webauthn.delete_failed, className: 'red darken-1' });
                    }

                }
            });
        },
        generateWebauthn: async function() {
            this.registrationInProgress = true;
            try {
                const data = await this.updateWebauthnData();

                // arguments for the webauthn registration
                const publicKeyCredentialCreationOptions = {
                    challenge: base64URLStringToBuffer(data.nonce),
                    rp: data.rp,
                    rpId: data.rp.id,
                    user: {
                        id: Uint8Array.from(data.user_id),
                        name: `${this.user.uid}@${data.rp.id}`,
                        displayName: `${this.user.uid}`
                    },
                    // Spec recommends at least supporting these
                    pubKeyCredParams: data.pubKeyTypes,
                    // user has 3 * 60 seconds to register
                    timeout: 3 * 60000,
                    // leaks data about the user if in direct mode.
                    attestation: "none",
                    extensions: {
                        credProps: true,
                    },
                    authenticatorSelection: {
                        residentKey:"preferred",
                        requireResidentKey:false,
                        userVerification:"preferred"
                    },
                    // Don't register the same credentials twice
                    excludeCredentials: data.auths.map(a => ({id: base64URLStringToBuffer(a.credentialID), type: "public-key"})),
                };

                // register
                const credentials = await navigator.credentials.create({publicKey: publicKeyCredentialCreationOptions});

                // PublicKeyCredential can not be serialized
                // because it contains some ArrayBuffers, which
                // can not be serialized.
                // This just translates the buffer to its' 'safe'
                // version.
                // This is only for the REGISTRATION part
                // It is slightly different from what is
                // used for authentication
                const SerializePKC = PKC => {
                    return {
                        id: PKC.id,
                        type: PKC.type,
                        rawId: bufferToBase64URLString(PKC.rawId),
                        response: {
                            attestationObject: bufferToBase64URLString(PKC.response.attestationObject),
                            clientDataJSON: bufferToBase64URLString(PKC.response.clientDataJSON),
                        }
                    };
                }

                await fetchApi({
                    method: "POST",
                    uri: this.formatApiUri("/webauthn/confirm_activate"),
                    body: JSON.stringify({
                        cred: SerializePKC(credentials),
                        cred_name: "Authenticator " + credentials.id.slice(-5),
                    }),
                    onSuccess: async res => {
                        if (res.data.registered) { // SUCCESS
                            await this.updateWebauthnData();
                            await this.renameAuthenticator(credentials.id);
                        }
                        else {
                            toast({ message: this.messages.error.webauthn.registration_failed, className: 'red darken-1' });
                        }
                    },
                    onStatus: {422: () => {
                        toast({ message: this.messages.error.webauthn.timeout, className: 'red darken-1' });
                    }},
                });
            }
            catch(e) {
                // Already registered
                if(e.name === "InvalidStateError") {
                    toast({ message: this.messages.error.webauthn.already_registered, className: 'red darken-1' });
                }
                // user said no / something like that
                else if(e.name === "NotAllowedError") {
                    toast({ message: this.messages.error.webauthn.user_declined, className: 'red darken-1' });
                }
                else {
                    toast({ message: this.messages.error.webauthn.generic, className: 'red darken-1' });
                    console.error("/api/webauthn/confirm_activate", e);
                }
            } finally {
                this.registrationInProgress = false;
            }
        },
    },
    template: '#webauthn-method',
};

const TransportForm = {
    props: {
        'user': Object,
        'messages': Object,
        'infos': Object,
        'transport': String,
        'inputType': String,
        'testAndSaveTransport': Function,
        'saveTransport': Function,
        'deleteTransport': Function,
        'isManager': Boolean,
    },
    template: '#transport_form'
};

const RandomCodeMethod = {
    props: {
        'user': Object,
        'messages': Object,
        'infos': Object,
        'activate': Function,
        'deactivate': Function,
        'hasValidTransportForRandom_codeMethod': Function,
        'formatApiUri': Function,
        'isManager': Boolean,
        'method': String,
    },
    components: {
        'transport-form': TransportForm,
    },
    watch: {
        "user.transports": {
            handler() {
                this.user.methods[this.method].askActivation = !this.hasValidTransportForRandom_codeMethod(this.method);
            },
            deep: true,
            immediate: true,
        },
    },
    methods: {
        testAndSaveTransport: async function(transport) {
            const new_transport = document.getElementById(transport + '-input').value.trim();
            try {
                const res = await fetchApi({
                    method: "GET",
                    uri: this.formatApiUri('/transport/' + transport + '/' + new_transport + "/test"),
                });
                const data = res.data;
                if (data.code != "Ok") {
                    toast({ message: 'Erreur interne, veuillez réessayer plus tard.', className: 'red darken-1' });
                } else {
                    const expected = data.otp;

                    const verifyCodeMessages = this.messages.api.methods.random_code.verify_code;

                    Swal.fire({ // https://sweetalert2.github.io/#configuration
                        title: verifyCodeMessages[transport].title,
                        html: verifyCodeMessages[transport].pre + new_transport + verifyCodeMessages[transport].post,
                        input: "number",
                        icon: "question",
                        // inputLabel: "Code",
                        inputPlaceholder: "000000",
                        customClass: { // https://sweetalert2.github.io/#customClass
                            popup: "modal",
                            container: "modal-content",
                            input: "center-align",
                            confirmButton: "waves-effect waves-light btn green contrasted",
                            cancelButton: "waves-effect waves-light btn red darken-1",
                        },
                        showCancelButton: true,
                        allowOutsideClick: false,
                        inputValidator: input => {
                            if (input != expected) {
                                return verifyCodeMessages.wrong;
                            }
                        },
                        showLoaderOnConfirm: true,
                        preConfirm: () => this.saveTransport(transport),
                    });
                }
            } catch (err) {
                toast({ message: err, className: 'red darken-1' });
            };
        },
        saveTransport: async function(transport) {
            const new_transport = document.getElementById(transport + '-input').value.trim();
            const res = await fetchApi({
                method: "PUT",
                uri: this.formatApiUri('/transport/' + transport + '/' + new_transport),
            });
            const data = res.data;
            if (data.code != "Ok") {
                toast({ message: 'Erreur interne, veuillez réessayer plus tard.', className: 'red darken-1' });
            } else {
                this.user.transports[transport] = new_transport;
                document.getElementById(transport + '-input').value = '';
                toast({ message: this.messages.success.update, className: 'green contrasted' });
            }
        },
        deleteTransport: function(transport) {
            const oldTransport = this.user.transports[transport];
            const message = this.messages.api.methods.random_code?.confirm_delete?.[transport]?.replace("%TRANSPORT%", oldTransport);
            if (window.confirm(message)) {
                this.user.transports[transport] = null;
    
                return fetchApi({
                    method: "DELETE",
                    uri: this.formatApiUri('/transport/' + transport),
                    onSuccess: res => {
                        if (res.data.code != "Ok") {
                            throw new Error(JSON.stringify({ code: res.data.code }));
                        }
                    },
                }).catch(err => {
                    this.user.transports[transport] = oldTransport;
                    toast({ message: err, className: 'red darken-1' });
                });
            }
        },
    },
    template: '#random_code-method'
};

const RandomCodeMailMethod = { 
    ...RandomCodeMethod,
    template: '#random_code_mail-method'
};

const Esupnfc = {
    template:'#esupnfc-method'
};

const UserDashboard = {
    props: {
        'user': Object,
        'methods': Object,
        'messages': Object,
        'infos': Object,
        'getAndSetUser': Function,
        'currentmethod': String,
    },
    components: {
        "push": PushMethod,
        "totp": TotpMethod,
        "bypass": BypassMethod,
        "passcode_grid": PasscodeGridMethod,
        "webauthn": WebAuthnMethod,
        "random_code": RandomCodeMethod,
        "random_code_mail": RandomCodeMailMethod,
        "esupnfc":Esupnfc
    },
    template: "#user-dashboard",
    watch: {
        currentmethod: {
            async handler(currentmethod) {
                if (!currentmethod) {
                    return;
                }
                if (this.user.methods[currentmethod]?.active) {
                    return;
                }
                // avoid overwriting a method that may have been activated in the meantime (e.g., TOTP auto-activated with push)
                await this.getAndSetUser();
                if (this.user.methods[currentmethod]?.active) {
                    return;
                }

                if (currentmethod === "webauthn") {
                    const webauthnData = await this.fetchWebauthnData();
                    if (webauthnData.auths.length) {
                        return;
                    }
                }

                switch (currentmethod) {
                    case "random_code":
                    case "random_code_mail":
                        if (this.hasValidTransportForRandom_codeMethod(currentmethod)) {
                            return
                        }
                    case "webauthn":
                    case "push":
                    case "totp":
                        return this.activate(currentmethod);
                }
            },
            immediate: true,
        }
    },
    methods: {
        formatApiUri: function(uri) {
            return '/api' + uri;
        },
        activate: async function(method) {
            try {
                switch (method) {
                    case 'push':
                        return await this.askPushActivation();
                    case 'bypass':
                        await this.standardActivate(method);
                        return await this.generateBypass();
                    case 'passcode_grid':
                        const { data } = await this.standardActivate(method);
                        return this.setPasscodeGrid(data);
                    case 'totp':
                        return await this.generateTotp();
                    default:
                        return await this.standardActivate(method);
                }
            } catch (err) {
                console.error('[activate] Échec activation', method, err);
                const methodLabel = this.methods?.[method]?.label || method;
                if (window.Swal) {
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Méthode non disponible',
                        html: `La méthode <strong>${methodLabel}</strong> n'est pas activable actuellement.<br><br>Elle est probablement non configurée sur ce serveur. Contactez votre administrateur si le problème persiste.`,
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#202E56'
                    });
                } else {
                    alert(`La méthode "${methodLabel}" n'est pas disponible actuellement.`);
                }
                // Rollback : retour à la home. currentmethod est une PROP (lecture seule) ;
                // c'est le composant racine qui pilote l'affichage via currentView.
                // On simule un clic sidebar « Accueil » (event-like : { currentTarget: { name, text } }).
                this.$root.navigate({ currentTarget: { name: 'home', text: this.messages?.api?.menu?.home || 'Accueil' } });
            }
        },
        askPushActivation: function() {
            return fetchApi({
                method: "PUT",
                uri: this.formatApiUri("/push/activate"),
                onSuccess: res => {
                    const data = res.data;
                    if (data.code == "Ok") {
                        this.user.methods.push.active = true;
                        this.user.methods.push.askActivation = true;
                        this.user.methods.push.activationCode = data.activationCode;
                        this.user.methods.push.qrCode = getImgWithAltText({ qrCodeImg: data.qrCode, qrCodeSrc: data.qrCodeSrc });
                        this.user.methods.push.deepLink = data.deepLink;
                        this.user.methods.push.api_url = this.infos.api_url;
                    } else {
                        throw new Error(JSON.stringify({ code: data.code }));
                    }
                },
            });
        },
        standardActivate: function(method) {
            return fetchApi({
                method: "PUT",
                uri: this.formatApiUri("/" + method + "/activate"),
                onSuccess: res => {
                    const data = res.data;
                    if (data.code == "Ok") {
                        this.user.methods[method].active = true;
                    } else {
                        throw new Error(JSON.stringify({ code: data.code }));
                    }
                },
            }).catch(err => {
                toast({ message: 'Erreur interne, veuillez réessayer plus tard.', className: 'red darken-1' });
                throw err;
            });
        },
        deactivate: function(method) {
            if (this.user.methods[method].askActivation || window.confirm(this.messages.api.action.confirm_deactivate)) {
                return fetchApi({
                    method: "PUT",
                    uri: this.formatApiUri("/" + method + "/deactivate"),
                    onSuccess: res => {
                        const data = res.data;
                        if (data.code == "Ok") {
                            this.user.methods[method].askActivation = false;
                            this.user.methods[method].active = false;
                        } else {
                            console.error(JSON.stringify({ code: data.code }));
                            throw new Error("Erreur interne, veuillez réessayer plus tard.");
                        }
                    },
                }).catch(err => {
                    toast({ message: err, className: 'red darken-1' });
                });
            }
        },
        generateBypassConfirm : function(){
            if (window.confirm(this.messages.api.action.confirm_generate))
                this.generateBypass();
        },
        generatePasscodeGridConfirm : function(){
            if (window.confirm(this.messages.api.action.confirm_generate))
                this.generatePasscodeGrid();
        },
        generateTotpConfirm : function(){
            if (window.confirm(this.messages.api.action.confirm_generate))
                this.generateTotp();
        },
        generateBypass: function() {
            return fetchApi({
                method: "POST",
                uri: this.formatApiUri("/generate/bypass"),
                onSuccess: res => {
                    const data = res.data;
                    if (data.code == "Ok") {
                        this.user.methods.bypass.codes = data.codes;
                        this.user.methods.bypass.generation_date = data.generation_date;
                    } else {
                        throw new Error(JSON.stringify({ code: data.code }));
                    }
                },
            }).catch(err => {
                toast({ message: err, className: 'red darken-1' });
                this.user.methods.bypass.active = false;
                throw err;
            });
        },
        generatePasscodeGrid: function() {
            return fetchApi({
                method: "POST",
                uri: this.formatApiUri("/generate/passcode_grid"),
                onSuccess: res => {
                    const data = res.data;
                    if (data.code == "Ok") {
                        this.setPasscodeGrid(data);
                    } else {
                        throw new Error(JSON.stringify({ code: data.code }));
                    }
                },
            }).catch(err => {
                toast({ message: err, className: 'red darken-1' });
                throw err;
            });
        },
        setPasscodeGrid: function(data) {
            this.user.methods.passcode_grid.grid = data.grid;
            this.user.methods.passcode_grid.generation_date = data.generation_date;
        },
        generateTotp: function() {
            return fetchApi({
                method: "POST",
                uri: this.formatApiUri("/generate/totp?require_method_validation=true"),
                onSuccess: res => {
                    const data = res.data;
                    if (data.code == "Ok") {
                        this.user.methods.totp.active = true;
                        this.user.methods.totp.askActivation = true;
                        this.user.methods.totp.secret = data.message;
                        this.user.methods.totp.qrCode = getImgWithAltText({ qrCodeImg: data.qrCode, qrCodeSrc: data.qrCodeSrc });
                        this.user.methods.totp.deepLink = data.deepLink;
                        this.user.methods.totp.uri = data.uri;
                        this.user.methods.totp.uid = this.user.uid;
                    } else {
                        throw new Error(JSON.stringify({ code: data.code }));
                    }
                },
            }).catch(err => {
                toast({ message: err, className: 'red darken-1' });
                throw err;
            });
        },
        hasValidTransportForRandom_codeMethod: function(method) {
            return this.user
                .methods[method].transports
                .some(transport => this.user.transports[transport]);
        },
        fetchWebauthnData: async function() {
            const { data } = await fetchApi({
                method: "POST",
                uri: this.formatApiUri("/generate/webauthn"),
            });
            return data;
        },
    },
};

/** Manager **/
const UserView = {
    ...UserDashboard,
    template: '#user-view',
    methods: {
        ...UserDashboard.methods,
        formatApiUri: function(uri) {
            return '/api/admin/' + this.user.uid + uri;
        },
    },
};

const ManagerDashboard = {
    props: {
        'methods': Object,
        'messages': Object,
        'infos': Object,
        'user': Object,
    },
    components: {
        "user-view": UserView
    },
    data: function () {
        return {
            user: {
                uid: String,
                displayName: String,
                methods: Object,
                transports: Object
            },
            users: [],
            requestedUid: '',
            debounceTimeout: null,
        }
    },
    watch: {
        requestedUid: function(newVal) {
            clearTimeout(this.debounceTimeout);

            this.debounceTimeout = setTimeout(() => {
                this.fetchUsersByToken(newVal);
            }, 300);
        }
    },
    mounted: async function() {
        const url = new URL(location);
        const user = url.searchParams.get('user');
        if (user) { // if url contains ?user=xxx
            await this.$nextTick();
            await this.getAndSetUser(user); // display user xxx
            await this.$nextTick();
            url.searchParams.set('user', '');
            history.pushState({}, '', url); // and remove xxx from current url
        }
    },
    methods: {
        fetchUsersByToken: function(token) {
            if (token?.length < 3) {
                this.users = [];
                return;
            }

            fetchApi({
                method: "GET",
                uri: `/api/admin/users?token=${encodeURIComponent(token)}`,
                onSuccess: res => {
                    this.users = res.data.users;
                }
            }).catch(err => {
                toast(err, 3000, 'red darken-1');
            });
        },
        checkUserThenGetAndSet: async function() {
            if (this.requestedUid) {
                if (await this.user_exists(this.requestedUid) || window.confirm("Aucun utilisateur avec pour identifiant '" + this.requestedUid + "' n'existe en base de données. Souhaitez-vous le créer ?")) {
                    this.getAndSetUser(this.requestedUid);
                    this.requestedUid = '';
                }
            }
        },
        user_exists: async function(uid) {
            if (this.users.some(user => user.uid == uid)) {
                return true;
            }
            return (await fetchApi({
                method: "GET",
                uri: `/api/admin/user/${uid}/exists`,
            })).data.user_exists;
        },
        getAndSetUser: function(uid) {
            return fetchApi({
                method: "GET",
                uri: "/api/admin/user/" + uid,
                onSuccess: res => {
                    this.setUser(uid, res.data.user);
                },
            }).catch(err => {
                toast({ message: err, className: 'red darken-1' });
            });
        },
        setUser: function(uid, user) {
            this.user = {
                uid: uid,
                displayName: user.displayName,
                methods: user.methods,
                transports: user.transports,
            }
        }
    },
    template: '#manager-dashboard'
};

/** Admin **/
const AdminDashboard = {
    props: {
        'messages': Object,
        'infos': Object,
        'methods': Object,
        'user': Object,
    },
    template: '#admin-dashboard',
    methods: {
        activate: function(event) {
            event.target.checked = true;
            return fetchApi({
                method: "PUT",
                uri: "/api/admin/" + event.target.name + "/activate",
                onSuccess: res => {
                    const data = res.data;
                    if (data.code == "Ok") {
                        this.methods[event.target.name].activate = true;
                    } else {
                        throw new Error(JSON.stringify({ code: data.code }));
                    }
                },
            }).catch(err => {
                event.target.checked = false;
                this.methods[event.target.name].activate = false;
                toast({ message: 'Erreur interne, veuillez réessayer plus tard.', className: 'red darken-1' });
            });
        },
        deactivate: function(event) {
            event.target.checked = false;
            return fetchApi({
                method: "PUT",
                uri: "/api/admin/" + event.target.name + "/deactivate",
                onSuccess: res => {
                    const data = res.data;
                    if (data.code == "Ok") {
                        this.methods[event.target.name].activate = false;
                    } else {
                        throw new Error(JSON.stringify({ code: data.code }));
                    }
                },
            }).catch(err => {
                event.target.checked = true;
                this.methods[event.target.name].activate = true;
                toast({ message: 'Erreur interne, veuillez réessayer plus tard.', className: 'red darken-1' });
            });
        },
        activateTransport: function(method, transport) {
            return fetchApi({
                method: "PUT",
                uri: "/api/admin/" + method + "/transport/" + transport + "/activate",
                onSuccess: res => {
                    const data = res.data;
                    if (data.code == "Ok") {
                        this.methods[method].transports.push(transport);
                    } else {
                        throw new Error(JSON.stringify({ code: data.code }));
                    }
                },
            }).catch(err => {
                toast({ message: 'Erreur interne, veuillez réessayer plus tard.', className: 'red darken-1' });
            });
        },
        deactivateTransport: function(method, transport) {
            return fetchApi({
                method: "PUT",
                uri: "/api/admin/" + method + "/transport/" + transport + "/deactivate",
                onSuccess: res => {
                    const data = res.data;
                    if (data.code == "Ok") {
                        const index = this.methods[method].transports.indexOf(transport);
                        if (index > -1) {
                            this.methods[method].transports.splice(index, 1);
                        }
                    } else {
                        throw new Error(JSON.stringify({ code: data.code }));
                    }
                },
            }).catch(err => {
                toast({ message: 'Erreur interne, veuillez réessayer plus tard.', className: 'red darken-1' });
            });
        },
    }
};

/** Stats  **/
const StatsDashboard = {
    props: {
        messages: Object,
        infos: Object,
        methods: Object,
        user: Object,
    },
    data() {
        return {
            data: {},
            loading: false,
            chart: null,
            chart2: null,
            chartMethodsCount: null,
        };
    },
    computed: {
        // AJOUT UX : KPIs dérivés des données brutes /api/admin/stats
        dominantMethod() {
            if (!this.data?.methods || !this.data?.totalMfaUsers) return null;
            const entries = Object.entries(this.data.methods);
            if (!entries.length) return null;
            const [methodKey, count] = entries.sort(([, a], [, b]) => b - a)[0];
            const label = this.messages?.api?.methods?.[methodKey]?.name || methodKey;
            return {
                label,
                count,
                pct: ((count / this.data.totalMfaUsers) * 100).toFixed(1),
            };
        },
        totalPushUsers() {
            if (!this.data?.pushPlatforms) return 0;
            return Object.values(this.data.pushPlatforms).reduce((a, b) => a + b, 0);
        },
    },
    methods: {
        fetchStats() {
            this.loading = true;
            fetchApi({
                method: 'GET',
                uri: '/api/admin/stats',
                onSuccess: async res => {
                    this.data = res.data;
                    this.loading = false;
                    await this.$nextTick();
                    await this.renderChart(); // appel une fois le DOM mis à jour
                },
            }).catch(err => {
                toast({ message: 'Erreur interne, veuillez réessayer plus tard.', className: 'red darken-1' });
            });
        },
        async renderChart() {


            await import ("/js/chart.js");
            await import ("/js/chartjs-plugin-datalabels.min.js");

            // AJOUT UX : alignement Chart.js sur l'identité visuelle UA
            Chart.defaults.font.family = '"Open Sans", system-ui, sans-serif';
            Chart.defaults.color = '#202E56';

            // Style commun des tooltips (couleur UA navy)
            const uaTooltip = {
                backgroundColor: '#202E56',
                titleFont: { family: '"Open Sans", system-ui', weight: 600 },
                bodyFont: { family: '"Open Sans", system-ui' },
                padding: 10,
                cornerRadius: 2,
                boxPadding: 4,
            };

            // this.data example :
            // {"totalUsers":32507,"totalMfaUsers":1887,"methods":{"totp":588,"bypass":838,"passcode_grid":38,"push":1072,"esupnfc":195,"webauthn":518},"pushPlatforms":{"iOS":354,"Android":716,"Mac":2}}

            const totalUsers = this.data.totalUsers;
            const totalMfaUsers = this.data.totalMfaUsers;

            if (this.chart) {
                this.chart.destroy(); // évite les superpositions
            }
            if (this.chart2) {
                this.chart2.destroy();
            }

            const statsChartMfaMethods = document.getElementById('statsChartMfaMethods');
            if(typeof statsChartMfaMethods !== 'undefined' && statsChartMfaMethods !== null) {

                const ctx = statsChartMfaMethods.getContext('2d');

                const methods = this.data.methods;

                const sorted = Object.entries(methods)
                    .sort(([, a], [, b]) => b - a); // tri décroissant

                const labels = sorted.map(([method]) => this.messages.api.methods[method]?.name || method);
                const activated = sorted.map(([, count]) => count);
                const notActivated = activated.map(count => totalMfaUsers - count);
                const title = this.messages.stats.chart_title
                    .replace("%NB_USERS_MFA%", totalMfaUsers)
                    .replace("%NB_USERS%", totalUsers)
                    .replace("%PERCENT_USERS_MFA%", ((totalMfaUsers / totalUsers) * 100).toFixed(1));


                this.chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [
                            {
                                label: this.messages.stats.methods_activated,
                                data: activated,
                                backgroundColor: '#00A0DC', // ua-blue (refonte UA)
                            },
                            {
                                label: this.messages.stats.methods_deactivated,
                                data: notActivated,
                                backgroundColor: '#E5E7EB', // gray-200 (refonte UA)
                            }
                        ],
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            // show all data for this label on hover
                            mode: 'index'
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: title,
                                font: { family: '"Barlow Condensed", Impact, sans-serif', size: 14, weight: 700 },
                                color: '#202E56',
                            },
                            tooltip: {
                                ...uaTooltip,
                                callbacks: {
                                    label: function (context) {
                                        const total = activated[context.dataIndex] + notActivated[context.dataIndex];
                                        const percent = ((context.raw / total) * 100).toFixed(1);
                                        return `${context.dataset.label}: ${context.raw} (${percent}%)`;
                                    }
                                }
                            },
                            datalabels: {
                                anchor: 'center',
                                align: 'center',
                                formatter: (value, context) => {
                                    const total = activated[context.dataIndex] + notActivated[context.dataIndex];
                                    const percent = ((value / total) * 100).toFixed(1);
                                    return `${percent}%`;
                                },
                                color: '#fff',
                                font: {
                                    weight: 'bold'
                                }
                            }
                        },
                        scales: {
                            x: {
                                stacked: true,
                                beginAtZero: true,
                                max: totalMfaUsers,
                                grid: { color: 'rgba(0,0,0,0.04)' },
                            },
                            y: {
                                stacked: true,
                                grid: { display: false },
                            }
                        }
                    },
                    plugins: [ChartDataLabels]
                });
            }

            const statsChartPushPlatforms = document.getElementById('statsChartPushPlatforms');
            if(typeof statsChartPushPlatforms !== 'undefined' && statsChartPushPlatforms !== null) {

                const pushPlatforms = this.data.pushPlatforms;
                const pushPlatformsLabels = Object.keys(pushPlatforms);
                const pushPlatformsData = Object.values(pushPlatforms);
                const totalMfaPushUsers = pushPlatformsData.reduce((a, b) => a + b, 0);

                // statsChartPushPlatforms as a pie chart
                const title = this.messages.stats.chart_platforms_title
                    .replace("%NB_USERS_MFA_PUSH%", totalMfaPushUsers)
                    .replace("%NB_USERS_MFA%", totalMfaUsers);

                const ctx2 = statsChartPushPlatforms.getContext('2d');
                this.chart2 = new Chart(ctx2, {
                    type: 'pie',
                    data: {
                        labels: pushPlatformsLabels,
                        datasets: [{
                            data: pushPlatformsData,
                            backgroundColor: ['#00A0DC', '#202E56', '#1107A0', '#CC5717', '#9B1E21'], // palette UA
                            borderWidth: 0,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: title,
                                font: { family: '"Barlow Condensed", Impact, sans-serif', size: 13, weight: 700 },
                                color: '#202E56',
                            },
                            tooltip: uaTooltip,
                            legend: {
                                position: 'bottom',
                                labels: {
                                    font: { family: '"Open Sans", system-ui', size: 11 },
                                    color: '#6B7280',
                                    padding: 12,
                                    boxWidth: 10,
                                    boxHeight: 10,
                                },
                                onHover: (evt, legendItem) => {
                                    const activeElement = {
                                        datasetIndex: 0,
                                        index: legendItem.index
                                    };
                                    this.chart2.tooltip.setActiveElements([activeElement]);
                                    this.chart2.update();
                                }
                            }
                        }
                    },
                    plugins: [ChartDataLabels]
                });
            }

            const methodsCount = this.data.users?.methodsCount
            const statsChartMfaMethodsCount = document.getElementById('statsChartMfaMethodsCount');
            if (statsChartMfaMethodsCount && methodsCount) {
                this.chartMethodsCount?.destroy();

                const methodsCountArray = Object.entries(methodsCount)

                const ctx = statsChartMfaMethodsCount.getContext('2d');
                this.chartMethodsCount = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: methodsCountArray.map(([count, _nb_users]) => this.messages.stats.methodsCount.label.replace("%NB_METHODS%", count)),
                        datasets: [{
                            data: methodsCountArray.map(([_count, nb_users]) => nb_users),
                            backgroundColor: '#202E56', // ua-navy (refonte UA)
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: this.messages.stats.methodsCount.title,
                                font: { family: '"Barlow Condensed", Impact, sans-serif', size: 13, weight: 700 },
                                color: '#202E56',
                            },
                            legend: {
                                display: false,
                            },
                            tooltip: {
                                ...uaTooltip,
                                callbacks: {
                                    label: context => this.messages.stats.methodsCount.context.replace("%NB_USERS%", context.raw),
                                }
                            },
                            datalabels: {
                                anchor: 'end',
                                align: 'top',
                                color: '#202E56',
                                font: {
                                    weight: 'bold',
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                            },
                            y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(0,0,0,0.04)' },
                                ticks: {
                                    precision: 0,
                                }
                            }
                        }
                    },
                    plugins: [ChartDataLabels],
                });
            }

        }
    },
    mounted() {
        this.fetchStats();
    },
    template: '#stats-dashboard',
};


const METHOD_WEIGHTS = {
  webauthn: 30, totp: 25, push: 20, esupnfc: 15,
  bypass: 10, passcode_grid: 8,
  random_code_mail: 5, random_code: 2
};

const METHOD_GROUPS = {
  recommended:   ['webauthn', 'totp', 'push', 'esupnfc'],
  complementary: ['bypass', 'passcode_grid'],
  weak:          ['random_code_mail', 'random_code']
};

/** Admin **/
const Home = {
    props: {
        messages: Object,
        'infos': Object,
        'methods': Object,
        'user': Object,
    },
    data: function () {
        return {
            // 'grid' (gestion, défaut) | 'fan' (vitrine)
            homeView: (function () { try { return localStorage.getItem('ua-home-view') || 'grid'; } catch (e) { return 'grid'; } })(),
            bentoSelected: null,
            fanActive: 0,
            fanMode: 'fan',     // 'fan' | 'pairs'
            _fanIdle: null,
            fanHover: false,
            fanInterval: 3000,      // vitesse du défilement (ms entre 2 cartes)
            fanIdleDelay: 10000,    // délai de survol avant passage en 2 colonnes
            _fanAuto: null,
            knobPct: 0
        };
    },
    computed: {
        // méthodes visibles, sous forme de tableau (indices stables pour l'éventail)
        visibleMethods: function () {
            var m = this.methods;
            return Object.keys(m)
                .filter(function (k) { return m[k].activate && m[k].authorize; })
                .map(function (k) { return m[k]; });
        },

        weightedScore() {
            const active = Object.entries(this.user?.methods || {})
                .filter(([_, m]) => m?.active).map(([n]) => n);
            const top2 = active.map(n => METHOD_WEIGHTS[n] || 0)
                .sort((a, b) => b - a).slice(0, 2);
            const sum = top2.reduce((s, w) => s + w, 0);
            const pct = Math.round((sum / 55) * 100);
            let level = 'Désactivé', color = '#94a3b8';
            if (active.length > 0) {
                if (pct <= 30)      { level = 'Faible';    color = '#dc2626'; }
                else if (pct <= 60) { level = 'Moyen';     color = '#CC5717'; }
                else if (pct <= 89) { level = 'Bon';       color = '#00A0DC'; }
                else                { level = 'Excellent'; color = '#16a34a'; }
            }
            return { pct, level, color, count: active.length, sum, objective: active.length >= 2 };
        },

        nextLevelSuggestion() {
            if (this.weightedScore.level === 'Excellent') return null;
            const activeNames = Object.entries(this.user?.methods || {})
                .filter(([_, m]) => m?.active).map(([n]) => n);
            const inactive = Object.keys(METHOD_WEIGHTS).filter(n => !activeNames.includes(n));
            if (inactive.length === 0) return null;
            const levels = ['Désactivé', 'Faible', 'Moyen', 'Bon', 'Excellent'];
            const targetLevel = levels[levels.indexOf(this.weightedScore.level) + 1];
            let best = null;
            for (const name of inactive) {
                const sim = [...activeNames, name].map(n => METHOD_WEIGHTS[n] || 0)
                    .sort((a, b) => b - a).slice(0, 2).reduce((s, w) => s + w, 0);
                const pct = Math.round((sim / 55) * 100);
                let lvl = 'Faible';
                if (pct > 89) lvl = 'Excellent';
                else if (pct > 60) lvl = 'Bon';
                else if (pct > 30) lvl = 'Moyen';
                if (lvl === targetLevel && (!best || METHOD_WEIGHTS[name] < best.gainPts)) {
                    best = { name, gainPts: METHOD_WEIGHTS[name], targetLevel };
                }
            }
            if (!best) {
                const top = inactive.reduce((b, n) => METHOD_WEIGHTS[n] > METHOD_WEIGHTS[b] ? n : b);
                best = { name: top, gainPts: METHOD_WEIGHTS[top], targetLevel: null };
            }
            return best;
        },

        methodGroups() {
            return METHOD_GROUPS;
        }
    },
    watch: {
        fanMode: function (m) {
            if (m === 'pairs') this.fanAutoStop();
            else if (!this.fanHover) this.fanAutoStart();
        },
        'weightedScore.pct'() {
            this.$nextTick(() => this.animateKnob());
        }
    },
    mounted: function () { this.fanAutoStart(); this.$nextTick(() => this.initKnob()); },
    beforeUnmount: function () { this.fanAutoStop(); this.fanClearIdle(); },
    methods: {
        initKnob() {
            const svg = document.querySelector('.knob-svg');
            if (!svg) return;
            // Nettoie les ticks éventuellement déjà présents (cas re-init)
            svg.querySelectorAll('.tick').forEach(t => t.remove());
            const TOTAL_TICKS = 40, MIN_DEG = -135, MAX_DEG = 135;
            const cx = 140, cy = 140, rInner = 118, rOuter = 132;
            for (let i = 0; i <= TOTAL_TICKS; i++) {
                const angle = MIN_DEG + (i / TOTAL_TICKS) * (MAX_DEG - MIN_DEG);
                const rad = (angle - 90) * Math.PI / 180;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', cx + Math.cos(rad) * rInner);
                line.setAttribute('y1', cy + Math.sin(rad) * rInner);
                line.setAttribute('x2', cx + Math.cos(rad) * rOuter);
                line.setAttribute('y2', cy + Math.sin(rad) * rOuter);
                line.setAttribute('stroke-width', 3);
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('class', 'tick');
                svg.appendChild(line);
            }
            this.animateKnob();
        },

        animateKnob() {
            const target = this.weightedScore.pct;
            // Rotation de l'aiguille vers l'angle final correspondant au pct
            const body = document.querySelector('.knob-body');
            if (body) {
                const finalAngle = -135 + (target / 100) * 270;
                // Reset à -135° puis transition vers la cible (forcer le replay)
                body.style.transform = 'rotate(-135deg)';
                // Petit délai pour que le navigateur applique le reset avant la cible
                setTimeout(() => {
                    body.style.transform = `rotate(${finalAngle}deg)`;
                }, 50);
            }
            const ACTIVE_TICKS = Math.round((target / 100) * 40);
            const ticks = this.$el?.querySelectorAll('.knob-svg .tick') || [];
            ticks.forEach(t => t.classList.remove('active'));
            setTimeout(() => {
                ticks.forEach((t, i) => {
                    setTimeout(() => { if (i <= ACTIVE_TICKS) t.classList.add('active'); }, i * 35);
                });
            }, 300);
            // Compteur animé
            this.knobPct = 0;
            if (target === 0) return;
            const step = () => {
                this.knobPct += 1;
                if (this.knobPct < target) setTimeout(step, 1500 / target);
            };
            setTimeout(step, 300);
        },

        methodState(name) {
            if (this.user?.methods?.[name]?.active) return 'on';
            return 'off';
        },

        methodWeight(name) {
            return METHOD_WEIGHTS[name] || 0;
        },

        navigate: function (target) {
            // Accepte une chaîne (cartes : @click="navigate(method.name)")
            // ou un événement DOM (sidebar : @click="navigate").
            const name = typeof target === 'string' ? target : target?.target?.name;
            if (!name) return;

            // Garde-fou : si la méthode n'est pas encore dans user.methods, l'initialiser
            // évite le crash du watcher `currentmethod` (user-dashboard) qui lit
            // user.methods[currentmethod].active sur un objet undefined.
            if (this.user && this.user.methods && !this.user.methods[name]) {
                this.user.methods[name] = { active: false };
            }

            // Si une sidenav legacy avec id correspondant existe, on clique dessus
            // (compatibilité avec dashboard.pug Materialize encore en place)
            const legacyLink = document.getElementById(name);
            if (legacyLink) {
                legacyLink.click();
                return;
            }

            // Sinon, on délègue à la navigate de l'app racine
            this.$root.navigate({
                target: { name, text: this.messages?.api?.menu?.[name] || name }
            });
        },

        // --- Vue éventail (vitrine) ---
        fanReducedMotion: function () {
            try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
            catch (e) { return false; }
        },
        fanAutoStart: function () {
            this.fanAutoStop();
            if (this.homeView !== 'fan' || this.fanMode !== 'fan') return;
            if (this.fanHover || this.fanReducedMotion()) return;
            if (this.visibleMethods.length < 2) return;
            var self = this;
            this._fanAuto = setInterval(function () {
                var n = self.visibleMethods.length;
                self.fanActive = (self.fanActive + 1) % n;
            }, this.fanInterval);
        },
        fanAutoStop: function () {
            if (this._fanAuto) { clearInterval(this._fanAuto); this._fanAuto = null; }
        },
        setHomeView: function (v) {
            this.homeView = v;
            try { localStorage.setItem('ua-home-view', v); } catch (e) {}
            if (v === 'fan') this.fanAutoStart(); else this.fanAutoStop();
        },
        // --- Vue bento (option B : aperçu en modal) ---
        bentoSpan: function (i) {
            var pattern = [ {c:2,r:2}, {c:2,r:1}, {c:1,r:1}, {c:1,r:1}, {c:2,r:1}, {c:1,r:1} ];
            var p = pattern[i % pattern.length];
            return { gridColumn: 'span ' + p.c, gridRow: 'span ' + p.r };
        },
        openBento: function (method) { this.bentoSelected = method; },
        closeBento: function () { this.bentoSelected = null; },
        bentoManage: function () { var m = this.bentoSelected; this.closeBento(); this.navigate(m.name); },
        fanColor: function (i) { return ['bleu', 'navy', 'warm'][i % 3]; },
        fanOff: function (i) {
            var n = this.visibleMethods.length;
            var r = i - this.fanActive;
            var alt = r > 0 ? r - n : r + n;
            return Math.abs(alt) < Math.abs(r) ? alt : r;
        },
        fanSlotStyle: function (i) {
            var W = 360, H = 168, maxOff = 2, spacing = 152, step = 10, depth = 140;
            if (this.fanMode === 'pairs') {
                var n = this.visibleMethods.length, rows = Math.ceil(n / 2);
                var r = Math.floor(i / 2), c = i % 2, last = (i === n - 1 && n % 2 === 1);
                var x = last ? 0 : (c === 0 ? -(W / 2 + 11) : (W / 2 + 11));
                var y = (r - (rows - 1) / 2) * (H + 22);
                return { transform: 'translate(-50%,-50%) translateX(' + x + 'px) translateY(' + y + 'px) scale(1)', opacity: 1, zIndex: 10, pointerEvents: 'auto' };
            }
            var o = this.fanOff(i), a = Math.abs(o), vis = a <= maxOff, lift = o === 0 ? -14 : 0;
            return {
                transform: 'translate(-50%,-50%) translateX(' + (o * spacing) + 'px) translateY(' + (a * 8 + lift) + 'px) translateZ(' + (-a * depth) + 'px) rotateZ(' + (o * step) + 'deg) scale(' + (o === 0 ? 1 : 0.9) + ')',
                opacity: vis ? 1 : 0,
                zIndex: 100 - a,
                pointerEvents: vis ? 'auto' : 'none'
            };
        },
        fanGo: function (i) { if (this.fanMode === 'fan') this.fanActive = i; },
        fanPrev: function () { if (this.fanMode === 'fan') { var n = this.visibleMethods.length; this.fanActive = (this.fanActive - 1 + n) % n; } },
        fanNext: function () { if (this.fanMode === 'fan') { var n = this.visibleMethods.length; this.fanActive = (this.fanActive + 1) % n; } },
        onCardClick: function (i, method) {
            // carte centrale (ou mode "par 2") => on ouvre la méthode ; sinon on la met au centre
            this.fanClearIdle();
            if (this.fanMode === 'pairs' || this.fanOff(i) === 0) this.navigate(method.name);
            else this.fanGo(i);
        },
        fanToggleMode: function () { this.fanClearIdle(); this.fanMode = this.fanMode === 'fan' ? 'pairs' : 'fan'; },
        fanStartIdle: function () {
            this.fanHover = true;
            this.fanAutoStop();
            this.fanClearIdle();
            if (this.fanMode === 'fan') {
                var self = this;
                this._fanIdle = setTimeout(function () { self.fanMode = 'pairs'; }, this.fanIdleDelay);
            }
        },
        fanClearIdle: function () { if (this._fanIdle) { clearTimeout(this._fanIdle); this._fanIdle = null; } },
        fanLeave: function () {
            this.fanHover = false;
            this.fanClearIdle();
            if (this.fanMode === 'pairs') this.fanMode = 'fan';
            this.fanAutoStart();
        }
    },
    template: '#home-dashboard'
};

/** Main **/
Vue.createApp({
    components: {
        "home": Home,
        "preferences": UserDashboard,
        "manager": ManagerDashboard,
        "admin": AdminDashboard,
        "stats": StatsDashboard
    },
    data() {
      return {
        pageTitle: 'Accueil',
        currentView: 'home',
        currentMethod: '',
        navLevel: 'root',  // 'root' | 'preferences' | 'manager' | 'admin'
        tutoLinks: {
            totp: '',
            push: '',
            webauthn: '',
            random_code_mail: '',
            random_code: '',
            bypass: '',
            passcode_grid: '',
            esupnfc: ''
        },
        methods: {},
        user: {
            uid: '',
            methods: {},
            transports: {}
        },
        users_methods:{},
        messages: {},
        infos: {
            api_url: "",
            uid: "",
            name: "",
            transport_regexes: {
                sms: "",
                mail: "",
            },
            lang: localStorage.getItem("lang") || "en",
            isMacOs: navigator.platform.startsWith("Mac"),
            mobile: /Android/i.test(navigator.userAgent) ? "android" :
                    /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" :
                    false,
            EsupAuth: { name: "Esup Auth", android: "https://play.google.com/store/apps/details?id=org.esupportail.esupAuth", ios: "https://apps.apple.com/fr/app/esup-auth/id1563904941" },
        },
        has_window_opener: Boolean(window.opener),
      };
    },
    watch: {
        messages: {
            handler(messages) {
                if (!this.infos.mobile) {
                    this.infos.esup_auth_download_link = messages?.api?.methods.push.esup_auth_download_link
                        .replace("%ANDROID_URL%", this.infos.EsupAuth.android)
                        .replace("%IOS_URL%", this.infos.EsupAuth.ios);
                } else {
                    this.infos.esup_auth_download_link = `<a href="${this.infos.EsupAuth[this.infos.mobile]}" target="_blank">Esup Auth</a>`;
                }
            },
            immediate: true,
        },
        has_active_method(val, prev) {
            // on small screens, show the menu which contains closeOtpManager button
            if (val && prev === false) toggle_visibility('slide-out')
        },
    },
    computed: {
        has_active_method() {
            const methods = Object.entries(this.user.methods)
            if (methods.length === 0) return undefined
            return methods
                .filter(([_key, value]) => value.active && !value.askActivation)
                .length > 0
        },
        availableMethodsCount: function() {
            if (!this.methods) return 0;
            const arr = Array.isArray(this.methods) ? this.methods : Object.values(this.methods);
            return arr.filter(m => m && m.activate && m.authorize).length;
        },
        activeMethodsCount: function() {
            if (!this.user || !this.user.methods) return 0;
            return Object.values(this.user.methods).filter(m => m && m.active === true).length;
        }
    },
    created: async function() {
        const messagesPromise = this.getMessages();
        this.getMethods();
        await this.getInfos();
        this.getAndSetUser();

        // wait for the #home button, then click on it
        await messagesPromise;
        await $('#home').promise();
        await this.$nextTick();
        document.getElementById("home")?.click();

        // if applicable, redirect to the user page specified in the URL
        await this.$nextTick();
        const managerButton = document.getElementById('manager');
        if (managerButton) { // if is manager
            if (new URL(window.location).searchParams.get('user')) { // and if url contains ?user=xxx
                managerButton.click(); // switch to manager dashboard
            };
        }
    },
    methods: {
        cleanMethods: function () {
            for (const method in this.methods) {
                if (method[0] == '_') delete this.methods[method];
                else {
                    this.methods[method].name = method;
                    this.methods[method].authorize=this.is_authorized(method);
                    if (this.messages.api) {
                        if (this.messages.api.methods[method]) this.methods[method].label = this.messages.api.methods[method].name;
                    }
                }
            }

        },

        drillInto: function(level) {
            this.navLevel = level;
        },
        drillBack: function() {
            this.navLevel = 'root';
        },

        handleDockHover: function(event) {
            const icon = event.currentTarget;
            const rect = icon.getBoundingClientRect();
            const ratio = (event.clientX - rect.left) / rect.width;
            const shift = ((Math.min(1, Math.max(0, ratio)) - 0.5) * 6).toFixed(1);
            icon.style.setProperty('--dock-shift', shift + 'px');
        },
        resetDockHover: function(event) {
            event.currentTarget.style.removeProperty('--dock-shift');
        },

        navigate: function(event) {
            // Fix UX : event.target = élément cliqué (peut être un SVG enfant) ;
            // event.currentTarget = le <a> sur lequel @click est attaché. On veut ce dernier
            // pour pouvoir lire l'attribut name="..." de manière fiable.
            const target = event.currentTarget;

            if (target.name == "manager") {
                this.pageTitle = target.text;
                this.currentView = 'manager';
            } else if (target.name == "admin") {
                this.currentView = 'admin';
                this.pageTitle = target.text;
            } else if (target.name == "stats") {
                this.currentView = 'stats';
                this.pageTitle = target.text;
            } else if (target.name == "home") {
                this.currentView = 'home';
                this.pageTitle = target.text;
            } else {
                this.pageTitle = "Préférences";
                this.currentMethod = target.name;
                this.currentView = 'preferences';
            }

            document.title = "ESUP OTP Manager - " + this.messages.api.menu[this.currentView];
            if(this.currentView == 'preferences') {
                document.title += " - " + this.messages.api.methods[this.currentMethod].name;
            }

            $('a').parent().removeClass('active');
            $('a').parent().attr('aria-current', 'false');
            $('#' + target.name).parent().addClass('active');
            $('#' + target.name).parent().attr('aria-current', 'page');
            if (document.getElementById("sidenav-overlay")) $('#navButton').click();
            this.getAndSetUser();
        },

        getAndSetUser: function() {
            return fetchApi({
                method: "GET",
                uri: "/api/user",
                onSuccess: res => {
                    this.setUser(res.data);
                },
            }).catch(err => {
                toast({ message: err, className: 'red darken-1' });
            });
        },

        setUser: function (data) {
            this.user.uid = this.infos.uid;
            this.user.name = this.infos.name;
            this.user.methods = data.user.methods;
            this.user.transports = data.user.transports;
        },
        getMethods: async function() {
            try {
                const methods = (await fetchApi({
                    method: "GET",
                    uri: "/api/methods",
                })).data;

                const users_methods = (await fetchApi({
                    method: "GET",
                    uri: "/manager/users_methods",
                })).data;

                this.users_methods = users_methods;
                this.setMethods(methods);
            } catch (err) {
                toast({ message: err, className: 'red darken-1' });
            }
        },
        getInfos: async function() {
            try {
                const infos = await fetchApi({
                    method: "GET",
                    uri: "/manager/infos",
                });
                Object.assign(this.infos, infos.data);
            } catch (err) {
                toast({ message: err, className: 'red darken-1' });
            }
        },
        setMethods: function (data) {
            this.methods = data.methods;
            this.cleanMethods();
        },
        closeOtpManagerWindow() {
            window.opener.postMessage('closeOtpManagerWindow', '*')
        },
        getMessages: function(language) {
            language ||= localStorage.getItem("lang") || '';
            return fetchApi({
                method: "GET",
                uri: "/manager/messages/" + language,
                onSuccess: res => {
                    const { lang, messages } = res.data;
                    this.setMessages(messages);
                    $('html').attr('lang', lang);
                    localStorage.setItem("lang", lang);
                    this.infos.lang = lang;
                },
            }).catch(err => {
                toast({ message: err, className: 'red darken-1' });
            });
        },
        setMessages: function (data) {
            this.messages = data;
            this.cleanMethods();
        },
    is_authorized: function (method) {
        return !this.users_methods?.unauthorized.includes(method);
    }
  }
})
.component('method-icon', {
    props: {
        name: { type: String, required: true },
        size: { type: String, default: '5' }
    },
    computed: {
        sizeClasses() {
            // Tailwind v4 doit voir les classes en littéral — on les whitelist ici
            const map = { '4': 'w-4 h-4', '5': 'w-5 h-5', '6': 'w-6 h-6', '8': 'w-8 h-8' };
            return map[this.size] || 'w-5 h-5';
        }
    },
    template: `
        <svg :class="[sizeClasses, 'flex-shrink-0']" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path v-if="name === 'totp'"             stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
            <path v-else-if="name === 'push'"        stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/>
            <path v-else-if="name === 'webauthn'"    stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33"/>
            <path v-else-if="name === 'random_code_mail'" stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/>
            <path v-else-if="name === 'random_code'" stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/>
            <path v-else-if="name === 'bypass'"      stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z"/>
            <path v-else-if="name === 'passcode_grid'" stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"/>
            <path v-else-if="name === 'esupnfc'"     stroke-linecap="round" stroke-linejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
            <path v-else                             stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
        </svg>
    `
})
.mount('#app')
