define([
    'settings/js/widgets/aci-widget',
    'settings/js/models/security-types',
    'text!settings/templates/widgets/community-widget.html'
], function(AciWidget, SecurityTypesModel, template) {

    return AciWidget.extend({
        currentSecurityType: null,
        communityTemplate: _.template(template),

        initialize: function(options) {
            AciWidget.prototype.initialize.call(this, options);

            _.bindAll(this, 'fetchNewSecurityTypes', 'getCommunity', 'handleNewSecurityTypes', 'toggleSecurityTypesInput', 'updateSecurityTypes');

            this.securityTypesModel = new SecurityTypesModel({}, {
                url: options.securityTypesUrl
            });

            this.securityTypesModel.on('change', this.handleNewSecurityTypes);
        },

        render: function() {
            AciWidget.prototype.render.call(this);

            this.$('button[name="validate"]').parent().after(this.communityTemplate({
                strings: this.strings
            }));

            this.$loginType = this.$('select[name="login-type"]');
            this.$aciDetails = this.$('div.'+this.controlGroupClass).eq(0);
            this.$typesSpan = this.$('.fetch-security-types');
        },

        communityHasChanged: function() {
            return !_.isEqual(this.getCommunity(), this.lastValidationConfig.community);
        },

        fetchNewSecurityTypes: function(community) {
            this.securityTypesModel.unset('securityTypes', {silent: true});

            this.securityTypesModel.fetch({
                data: {
                    host: community.host,
                    port: community.port,
                    protocol: community.protocol
                }
            });
        },

        getCommunity: function() {
            return AciWidget.prototype.getConfig.call(this);
        },

        getConfig: function() {
            return {
                community: this.getCommunity(),
                method: this.$loginType.val() || this.currentSecurityType
            };
        },

        handleInputChange: function() {
            this.hideValidationInfo();

            if (!_.isUndefined(this.lastValidation) && !this.communityHasChanged()) {
                this.setValidationFormatting(this.lastValidation ? this.successClass : this.errorClass);
                this.toggleSecurityTypesInput(this.lastValidation && this.securityTypesModel.get('securityTypes'));
            } else {
                this.setValidationFormatting('clear');
                this.toggleSecurityTypesInput(false);
            }
        },

        handleNewSecurityTypes: function() {
            this.updateSecurityTypes();
            this.toggleSecurityTypesInput(!this.communityHasChanged());
        },

        handleValidation: function(config, response) {
            if (_.isEqual(config.community, this.lastValidationConfig.community)) {
                this.lastValidation = response.valid;
                this.lastValidation && this.fetchNewSecurityTypes(config.community);
                this.hideValidationInfo();

                this.displayValidationMessage(!this.communityHasChanged(), response);
            }
        },

        setValidationFormatting: function(state) {
            if (state === 'clear') {
                this.$aciDetails.removeClass(this.successClass + ' ' + this.errorClass);
                this.$loginType.parent().removeClass(this.errorClass);
                this.$('.fetch-security-types').removeClass('hide');
            } else {
                this.$aciDetails.addClass(state)
                    .removeClass(state === this.successClass ? this.errorClass : this.successClass);
            }
        },

        toggleSecurityTypesInput: function(isEnabled) {
            this.$typesSpan.toggleClass('hide', isEnabled);
            this.$loginType.attr('disabled', !isEnabled);
        },

        triggerValidation: function() {
            this.setValidationFormatting('clear');
            this.hideValidationInfo();

            if (AciWidget.prototype.validateInputs.apply(this, arguments)) {
                this.trigger('validate');
            }
        },

        updateConfig: function(config) {
            AciWidget.prototype.updateConfig.call(this, config.community);
            this.currentSecurityType = config.method;
            this.securityTypesModel.unset('securityTypes', {silent: true});
            this.toggleSecurityTypesInput(false);
            this.updateSecurityTypes();
        },

        updateSecurityTypes: function() {
            var types = this.securityTypesModel.get('securityTypes');
            var currentType = this.$loginType.val() || this.currentSecurityType;
            this.$loginType.empty();

            if (types) {
                if (currentType === 'cas' || currentType === 'external') {
                    // If we are using a method unknown to community, append it to the dropdown.
                    this.$loginType.append(new Option(currentType, currentType, true, true));
                }

                _.each(types, function(type) {
                    this.$loginType.append(new Option(type, type, false, type === currentType));
                }, this);

                var currentOption = this.$loginType.find('[value="' + currentType + '"]');

                if(currentOption.length) {
                    this.$loginType.val(currentType);
                } else {
                    this.$loginType.val(_.first(types));
                }
            } else if (currentType) {
                this.$loginType.append(new Option(currentType, currentType, true, true));
            }
        },

        validateInputs: function() {
            var isLoginTypeValid = this.getConfig().method !== 'default';

            if (!isLoginTypeValid) {
                this.updateInputValidation(this.$loginType);
                this.$('.fetch-security-types').addClass('hide');
            }

            return AciWidget.prototype.validateInputs.apply(this, arguments) && isLoginTypeValid;
        }
    });

});
