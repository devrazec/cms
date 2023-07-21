const eventBus = new Vue();

Vue.filter('translate', function (value) {
  if (!value) return ''
  transvalue = value.replace(/[ ]/g,"_").replace(/[.]/g, "_").replace(/[,]/g, "_").replace(/[-]/g, "_").replace(/[,]/g,"_").toUpperCase()
  translated_string = labels[transvalue]
  if(!translated_string || translated_string.length === 0){
    return value
  } else {
    return labels[transvalue]
  }
})

const contentComponent = Vue.component('content-block', {
	props: ['body', 'load'],
	template: '<div ref="bloxcomponent" class="blox-editor" :class="newblock">' +
				'<div v-if="newblock" class="newblock-info">Choose a content-type <button class="newblock-close" @click.prevent="closeNewBlock($event)">close</button></div>' +	
				'<div class="blox-wrapper" :class="{ editactive: edit }">' +
				 '<div class="sideaction" slot="header" v-if="body">' + 
 						'<button class="add" :disabled="disabled" :title="\'add content-block\'|translate" @mousedown.prevent="disableSort()" @click.prevent="addNewBlock($event)"><svg class="icon icon-plus"><use xlink:href="#icon-plus"></use></svg></button>' +
				  	'<button class="delete" :disabled="disabled" :title="\'delete content-block\'|translate" @mousedown.prevent="disableSort()" @click.prevent="deleteBlock($event)"><svg class="icon icon-close"><use xlink:href="#icon-close"></use></svg></button>' +
				 '</div>' + 
				 '<div class="background-helper" @keyup.enter="submitBlock" @click="getData">' +
				  '<div class="component" ref="component">' +
				   '<transition name="fade-editor">' +
				    '<component :disabled="disabled" :compmarkdown="compmarkdown" @updatedMarkdown="updateMarkdown" :is="componentType"></component>' +
				   '</transition>' +
				   '<div class="blox-buttons" v-if="edit">' + 
				    '<button class="edit" :disabled="disabled" @click.prevent="saveBlock">{{ \'save\'|translate }}</button>' +
				    '<button class="cancel" :disabled="disabled" @click.prevent="cancel">{{ \'cancel\'|translate }}</button>' +
				   '</div>' +
				  '</div>' +
				  '<div :class="preview" ref="preview"><slot></slot></div>' +
				 '</div>' +
				'</div>' +
				'<div v-if="load" class="loadoverlay"><span class="load"></span></div>' +
			  '</div>',
	data: function () {
		return {
			preview: 'visible',
			edit: false,
			compmarkdown: '',
			componentType: '',
			disabled: false,
			newblock: false,
		}
	},
	mounted: function()
	{
		eventBus.$on('closeComponents', this.closeComponents);
	},
	methods: {
		disableSort: function(event)
		{
			this.$root.$data.sortdisabled = true; 
		},
		addNewBlock: function(event)
		{
			/* we have to get from dom because block-data might not be set when user clicked on add button before opened the component */
			var bloxeditor = event.target.closest('.blox-editor');
			var bloxid = bloxeditor.getElementsByClassName('blox')[0].dataset.id;
		
			this.switchToPreviewMode();
		
			/* add new empty data */
			this.$root.$data.html.splice(bloxid,0, false);
			this.$root.$data.markdown.splice(bloxid,0, '');
			
			/* show overlay and bring newblock to front, so that user cannot change any other data (ids not synchronized with stored data now) */
			this.$root.$data.bloxOverlay = true;
			this.$root.$data.newblock = true;
			this.newblock = 'newblock';
			self.$root.$data.sortdisabled = true;
		},
		closeNewBlock: function($event)
		{
			var bloxeditor = event.target.closest('.blox-editor');			
			var bloxid = bloxeditor.getElementsByClassName('blox')[0].dataset.id;

			this.switchToPreviewMode();
			
			this.$root.$data.bloxOverlay = false;
			this.$root.$data.newblock = false;
			this.newblock = false;
			self.$root.$data.sortdisabled = false; 

			this.$root.$data.html.splice(bloxid,1);
			this.$root.$data.markdown.splice(bloxid,1);
		},
		updateMarkdown: function($event)
		{
			eventBus.$emit('markdownChanged', $event);
			self.$root.$data.unsafed = true;
			this.edit = true;
			this.unsafed = true;
			this.compmarkdown = $event;
			this.setComponentSize();
		},
		setComponentSize: function()
		{
			if(this.componentType == 'image-component' || this.componentType == 'file-component')
			{
				myself = this;
				setTimeout(function(){ 
					myself.$nextTick(function () 
					{
						myself.$refs.preview.style.minHeight = myself.$refs.component.offsetHeight + 'px';
					});
				}, 200);
			}
			else
			{
				this.$nextTick(function () 
				{
					this.$refs.preview.style.minHeight = this.$refs.component.offsetHeight + 'px';
				});				
			}
		},
		switchToEditMode: function()
		{
			if(this.edit){ return; }

			if(this.$root.$data.unsafed)
			{
				publishController.errors.message = "Please save or cancel your changes.";
				return;
			}

			eventBus.$emit('closeComponents');

			self = this;

			self.$root.$data.freeze = true; 						/* freeze the data */
		  	self.$root.$data.sortdisabled = true;					/* disable sorting */
			this.preview = 'hidden'; 								/* hide the html-preview */
			this.edit = true;										/* show the edit-mode */
			this.compmarkdown = self.$root.$data.blockMarkdown;		/* get markdown data */
			this.componentType = self.$root.$data.blockType;		/* get block-type of element */
			this.setComponentSize();
		},
		closeComponents: function()
		{
			this.preview = 'visible';
			this.edit = false;
			this.componentType = false;
			if(this.$refs.preview)
			{
				this.$refs.preview.style.minHeight = "auto";
			}
		},
		cancel: function()
		{
			self = this;
			self.$root.$data.unsafed = false;
			this.switchToPreviewMode();
		},
		switchToPreviewMode: function()
		{
			self = this;
			self.$root.$data.freeze = false;				/* activate the data again */
			self.$root.sortdisabled = false;				/* activate sorting again */
			this.preview = 'visible';						/* show the html-preview */
			this.edit = false;								/* hide the edit mode */
			this.compmarkdown = '';							/* clear markdown content */
			this.componentType = false;						/* delete the component type */
			self.$root.$data.blockType = false;
			self.$root.$data.blockMarkdown = false;
			self.$root.$data.file = false;
			publishController.errors.message = false;		/* delete all error messages */
			this.$refs.preview.style.minHeight = "auto";
		},
		freezePage: function()
		{
			this.disabled = 'disabled';
			this.load = true;
			publishController.errors.message = false;
			publishController.publishDisabled = true;
			var self = this;
			self.$root.$data.freeze = true;
		},
		activatePage: function()
		{
			this.disabled = false;
			this.load = false;
			publishController.publishDisabled = false;
		},
		getData: function()
		{
			self = this;
			if(self.$root.$data.blockType != '')
			{
				this.switchToEditMode();
			}
		},
 		submitBlock: function(){
			var emptyline = /^\s*$(?:\r\n?|\n)/gm;
			
			/* allow empty lines for these components */
			if(this.componentType == "code-component" || this.componentType == "math-component" || this.componentType == "notice-component"){ }
			
			/* add new line with markup for these components */
			else if(this.componentType == "ulist-component" || this.componentType == "olist-component")
			{
				var listend = (this.componentType == "ulist-component") ? '* \n' : '1. \n';
				var liststyle = (this.componentType == "ulist-component") ? '* ' : '1. ';
				
				if(this.compmarkdown.endsWith(listend))
				{
					this.compmarkdown = this.compmarkdown.replace(listend, '');
					this.saveBlock();
				}
				else
				{
					var mdtextarea 		= document.getElementsByTagName('textarea');
					var start 			= mdtextarea[0].selectionStart;
					var end 			= mdtextarea[0].selectionEnd;
					
					this.compmarkdown 	= this.compmarkdown.substr(0, end) + liststyle + this.compmarkdown.substr(end);

					mdtextarea[0].focus();
					if(mdtextarea[0].setSelectionRange)
					{
						setTimeout(function(){
							var spacer = (this.componentType == "ulist-component") ? 2 : 3;
							mdtextarea[0].setSelectionRange(end+spacer, end+spacer);
						}, 1);
					}
				}
			}
			/* save or close for all other components */
			else if(this.compmarkdown.search(emptyline) > -1)
			{
				var checkempty = this.compmarkdown.replace(/(\r\n|\n|\r|\s)/gm,"");
				if(checkempty == '')
				{
					this.$root.$data.unsafed = false;
					this.switchToPreviewMode();
				}
				else
				{
					this.saveBlock();
				}
			}
		},
		saveBlock: function()
		{
			if(this.compmarkdown == undefined || this.compmarkdown.replace(/(\r\n|\n|\r|\s)/gm,"") == '')
			{
				this.$root.$data.unsafed = false;
				this.switchToPreviewMode();
			}
			else
			{
				this.freezePage();

				var self = this;
				
/*				if(this.componentType != 'definition-component')
				{
					var compmarkdown = this.compmarkdown.split('\n\n').join('\n');
				}
*/				
				var compmarkdown = this.compmarkdown;

				var params = {
					'url':				document.getElementById("path").value,
					'markdown':			compmarkdown,
					'block_id':			self.$root.$data.blockId,
					'csrf_name': 		document.getElementById("csrf_name").value,
					'csrf_value':		document.getElementById("csrf_value").value,
				};

				if(this.componentType == 'image-component' && self.$root.$data.file)
				{
					var url 	= self.$root.$data.root + '/api/v1/image';
					var method 	= 'PUT';
					params.new 	= false;
					if(self.$root.$data.newblock || self.$root.$data.blockId == 99999)
					{
						params.new = true;
					}
				}
				else if(this.componentType == 'video-component')
				{
					var url 	= self.$root.$data.root + '/api/v1/video';
					var method 	= 'POST';
					params.new 	= false;
					if(self.$root.$data.newblock || self.$root.$data.blockId == 99999)
					{
						params.new = true;
					}
					else
					{
						var oldVideoID = this.$root.$data.blockMarkdown.match(/#.*? /);
						if(this.compmarkdown.indexOf(oldVideoID[0].substring(1).trim()) !== -1)
						{
							this.$root.$data.unsafed = false;
							this.activatePage();
							this.switchToPreviewMode();	
							return;
						}
					}
				}
				else if(this.componentType == 'file-component')
				{
					var url 	= self.$root.$data.root + '/api/v1/file';
					var method 	= 'PUT';
					params.new 	= false;
					if(self.$root.$data.newblock || self.$root.$data.blockId == 99999)
					{
						params.new = true;
					}
				}
				else if(self.$root.$data.newblock || self.$root.$data.blockId == 99999)
				{
					var url = self.$root.$data.root + '/api/v1/block';
					var method = 'POST';
				}
				else
				{
					var url = self.$root.$data.root + '/api/v1/block';
					var method 	= 'PUT';
				}


				sendJson(function(response, httpStatus)
				{
					if(httpStatus == 400)
					{
						this.$root.$data.unsafed = false;
						self.activatePage();
						publishController.errors.message = "Looks like you are logged out. Please login and try again.";
					}
					else if(response)			
					{
						self.activatePage();

						var result = JSON.parse(response);
									
						if(result.errors)
						{
							self.$root.$data.unsafed = false;
							publishController.errors.message = result.errors.message;
						}
						else
						{
							var thisBlockType = self.$root.$data.blockType;
							
							self.$root.$data.unsafed = false;
							self.switchToPreviewMode();
							
							if(self.$root.$data.blockId == 99999)
							{
								self.$root.$data.markdown.push(result.markdown);
								self.$root.$data.html.push(result.content);

								self.$root.$data.blockMarkdown = '';
								self.$root.$data.blockType = 'markdown-component';
								self.getData();
								var textbox = document.querySelectorAll('textarea')[0];
								if(textbox){ textbox.style.height = "70px"; }
							}
							else if(self.$root.$data.newblock)
							{
								self.$root.$data.html.splice(result.id,1,result.content);
								self.$root.$data.html.splice(result.toc.id,1,result.toc);
								self.$root.$data.markdown[result.id] = result.markdown;								

								self.$root.$data.blockMarkdown = '';
								self.$root.$data.blockType = '';
								self.$root.$data.bloxOverlay = false;
								self.$root.$data.newblock = false;
								self.newblock = false;
							}
							else
							{
								self.$root.$data.markdown[result.id] = result.markdown;
								self.$root.$data.html.splice(result.id,1,result.content);

								if(result.id == 0){ self.$root.$data.title = result.content; }

								self.$root.$data.blockMarkdown = '';
								self.$root.$data.blockType = '';
							}

							/* update the table of content if in result */
							if(result.toc)
							{
								self.$root.$data.html.splice(result.toc.id, 1, result.toc);
							}

							/* check math here */
							self.$root.checkMath(result.id);

							/* check youtube here */
							if(thisBlockType == "video-component")
							{
								setTimeout(function(){ 
									self.$nextTick(function () 
									{
										self.$root.checkVideo(result.id);
									});
								}, 300);
							}

							/* update the navigation and mark navigation item as modified */
							navi.getNavi();

						}
					}
					else if(httpStatus != 200)
					{
						self.$root.$data.unsafed = false;
						self.activatePage();
						publishController.errors.message = "Sorry, something went wrong. Please refresh the page and try again.";
					}	
				}, method, url, params);
			}
		},
		deleteBlock: function(event)
		{
			this.freezePage();
			
			var bloxeditor = event.target.closest('.blox-editor');
			
			var bloxid = bloxeditor.getElementsByClassName('blox')[0].dataset.id;
	
			var self = this;

	        myaxios.delete('/api/v1/block',{
	        	data: {
					'url':				document.getElementById("path").value,
					'block_id':			bloxid,
					'csrf_name': 		document.getElementById("csrf_name").value,
					'csrf_value':		document.getElementById("csrf_value").value,
	        	}
			})
	        .then(function (response)
	        {
				self.$root.$data.unsafed = false;
				self.activatePage();
				self.switchToPreviewMode();
				self.$root.$data.html.splice(bloxid,1);
				self.$root.$data.markdown.splice(bloxid,1);
				self.$root.$data.blockMarkdown = '';
				self.$root.$data.blockType = '';

				/* update the table of content if in result */
				if(response.data.toc)
				{
					self.$root.$data.html.splice(response.data.toc.id, 1, response.data.toc);
				}
						
				/* update the navigation and mark navigation item as modified */
				navi.getNavi();
	        })
	        .catch(function (error)
	        {
	           	if(error.response)
	            {
					publishController.errors.message = error.response.data.errors.message;
	            }
	        });
		},
	},
})

const inlineFormatsComponent = Vue.component('inline-formats', {
	template: '<div><div :style="{ left: `${x}px`, top: `${y}px`, width: `${z}px` }" @mousedown.prevent="" v-show="showInlineFormat" id="formatBar" class="inlineFormatBar">' + 
				  '<div  v-if="link">' + 
				      '<input v-model="url" @keyup.13="formatLink" ref="urlinput" class="urlinput" type="text" placeholder="insert url">' + 
					  '<span class="inlineFormatItem inlineFormatLink" @mousedown.prevent="formatLink"><svg class="icon icon-check"><use xlink:href="#icon-check"></use></svg></span>' + 
					  '<span class="inlineFormatItem inlineFormatLink" @mousedown.prevent="closeLink"><svg class="icon icon-cross"><use xlink:href="#icon-cross"></use></svg></i></span>' + 
				  '</div>' +
				  '<div v-else>' +
					  '<span class="inlineFormatItem" @mousedown.prevent="formatBold"><svg class="icon icon-bold"><use xlink:href="#icon-bold"></use></svg></span>' + 
					  '<span class="inlineFormatItem" @mousedown.prevent="formatItalic"><svg class="icon icon-italic"><use xlink:href="#icon-italic"></use></svg></span>' + 
					  '<span class="inlineFormatItem" @mousedown.prevent="openLink"><svg class="icon icon-link"><use xlink:href="#icon-link"></use></svg></span>' + 
					  '<span v-if="code" class="inlineFormatItem" @mousedown.prevent="formatCode"><svg class="icon icon-embed"><use xlink:href="#icon-embed"></use></svg></span>' + 
					  '<span v-if="math" class="inlineFormatItem" @mousedown.prevent="formatMath"><svg class="icon icon-omega"><use xlink:href="#icon-omega"></use></svg></span>' +
				   '</div>' + 
				'</div><slot></slot></div>',
	data: function(){
		return {
			formatBar: false,
			formatElements: 0,
			startX: 0,
			startY: 0,
     		x: 0,
     		y: 0,
     		z: 150,
     		textComponent: '',
     		selectedText: '',
     		startPos: false,
     		endPos: false,
     		showInlineFormat: false,
     		link: false,
     		url: '',
     		code: (formatConfig.indexOf("code") > -1) ? true : false,
     		math: (formatConfig.indexOf("math") > -1) ? true : false,
     	}
	},
	mounted: function() {
		this.formatBar = document.getElementById('formatBar');
		window.addEventListener('mouseup', this.onMouseup),
		window.addEventListener('mousedown', this.onMousedown)
	},
	beforeDestroy: function() {
		window.removeEventListener('mouseup', this.onMouseup),
		window.removeEventListener('mousedown', this.onMousedown)
	},
	computed: {
		highlightableEl: function () {    
			return this.$slots.default[0].elm  
		}
	},
	methods: {
		onMousedown: function(event) {
			this.startX = event.offsetX;
			this.startY = event.offsetY;
		},
		onMouseup: function(event) {

			/* if click is on format popup */
			if(this.formatBar.contains(event.target))
			{
				return;
			}

			/* if click is outside the textarea */
			if(!this.highlightableEl.contains(event.target))
			{
		  		this.showInlineFormat = false;
		  		this.link = false;
		  		return;
			}

			this.textComponent = document.getElementsByClassName("mdcontent")[0];

			/* grab the selected text */
			if (document.selection != undefined)
			{
		    	this.textComponent.focus();
		    	var sel = document.selection.createRange();
		    	selectedText = sel.text;
		  	}
		  	/* Mozilla version */
		  	else if (this.textComponent.selectionStart != undefined)
		  	{
		    	this.startPos = this.textComponent.selectionStart;
		    	this.endPos = this.textComponent.selectionEnd;
		    	selectedText = this.textComponent.value.substring(this.startPos, this.endPos)
		  	}

		  	var trimmedSelection = selectedText.replace(/\s/g, '');

		  	if(trimmedSelection.length == 0)
		  	{
		  		this.showInlineFormat = false;
		  		this.link = false;
		  		return;
		  	}

		  	/* determine the width of selection to position the format bar */
		  	if(event.offsetX > this.startX)
		  	{
		  		var width = event.offsetX - this.startX;
		  		this.x = event.offsetX - (width/2);
		  	}
		  	else
		  	{
		  		var width = this.startX - event.offsetX;
		  		this.x = event.offsetX + (width/2);
		  	}

		  	this.y = event.offsetY - 15;

		  	/* calculate the width of the format bar */
			this.formatElements = document.getElementsByClassName('inlineFormatItem').length;
			this.z = this.formatElements * 30;

			this.showInlineFormat = true;
			this.selectedText = selectedText;
		},
		formatBold()
		{
			content = this.textComponent.value;
			content = content.substring(0, this.startPos) + '**' + this.selectedText + '**' + content.substring(this.endPos, content.length);
			this.$parent.updatemarkdown(content);
		  	this.showInlineFormat = false;			
		},
		formatItalic()
		{
			content = this.textComponent.value;
			content = content.substring(0, this.startPos) + '_' + this.selectedText + '_' + content.substring(this.endPos, content.length);
			this.$parent.updatemarkdown(content);
		  	this.showInlineFormat = false;			
		},
		formatCode()
		{
			content = this.textComponent.value;
			content = content.substring(0, this.startPos) + '`' + this.selectedText + '`' + content.substring(this.endPos, content.length);
			this.$parent.updatemarkdown(content);
		  	this.showInlineFormat = false;						
		},
		formatMath()
		{
			content = this.textComponent.value;
			content = content.substring(0, this.startPos) + '$' + this.selectedText + '$' + content.substring(this.endPos, content.length);
			this.$parent.updatemarkdown(content);
		  	this.showInlineFormat = false;			
		},
		formatLink()
		{
			if(this.url == "")
			{
				this.link = false;
			  	this.showInlineFormat = false;
				return;
			}
			content = this.textComponent.value;
			content = content.substring(0, this.startPos) + '[' + this.selectedText + '](' + this.url + ')' + content.substring(this.endPos, content.length);
			this.$parent.updatemarkdown(content);
		  	this.showInlineFormat = false;
		  	this.link = false;
		},
		openLink()
		{
			this.link = true;
			this.url = '';
			this.z = 200;
			this.$nextTick(() => this.$refs.urlinput.focus());
		},
		closeLink()
		{
			this.link = false;
			this.url = '';
		  	this.showInlineFormat = false;
		}
	}
})

const titleComponent = Vue.component('title-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div><input type="text" ref="markdown" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown"></div>',
	mounted: function(){
		this.$refs.markdown.focus();
		autosize(document.querySelectorAll('textarea'));
	},
	methods: {
		updatemarkdown: function(event)
		{
			this.$emit('updatedMarkdown', event.target.value);
		},
	},
})

const markdownComponent = Vue.component('markdown-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div>' + 
				'<div class="contenttype"><svg class="icon icon-pilcrow"><use xlink:href="#icon-pilcrow"></use></svg></div>' +
				'<inline-formats>' +
					'<textarea id="activeEdit" class="mdcontent" ref="markdown" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown(event.target.value)"></textarea>' + 
			  	'</inline-formats>' +
			  '</div>',
	mounted: function(){
		this.$refs.markdown.focus();
		autosize(document.querySelectorAll('textarea'));
	},
	methods: {
		updatemarkdown: function(value)
		{
			this.$emit('updatedMarkdown', value);
		},
	},
})

const hrComponent = Vue.component('hr-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div>' + 
				'<div class="contenttype"><svg class="icon icon-pilcrow"><use xlink:href="#icon-pilcrow"></use></svg></div>' +
				'<textarea class="mdcontent" ref="markdown" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown">---</textarea>' +
				'</div>',
	mounted: function(){
		this.$refs.markdown.focus();
		autosize(document.querySelectorAll('textarea'));
		this.$emit('updatedMarkdown', '---');
	},
	methods: {
		updatemarkdown: function(event)
		{
			this.$emit('updatedMarkdown', event.target.value);
		},
	},
})

const tocComponent = Vue.component('toc-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div>' + 
				'<div class="contenttype"><svg class="icon icon-list-alt"><use xlink:href="#icon-list-alt"></use></svg></div>' +
				'<textarea class="mdcontent" ref="markdown" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown">---</textarea>' +
				'</div>',
	mounted: function(){
		this.$refs.markdown.focus();
		autosize(document.querySelectorAll('textarea'));
		this.$emit('updatedMarkdown', '[TOC]');
	},
	methods: {
		updatemarkdown: function(event)
		{
			this.$emit('updatedMarkdown', event.target.value);
		},
	},
})

const codeComponent = Vue.component('code-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div>' + 
				'<input type="hidden" ref="markdown" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown" />' +	
				'<div class="contenttype"><svg class="icon icon-embed"><use xlink:href="#icon-embed"></use></svg></div>' +
				'<div class="w-100 pa2 white bg-tm-green dib">' +
				  '<label for="language" class="w-10">{{ \'Language\'|translate }}: </label>' + 
				  '<input class="pa1 w-90 min-h-100" name="language" type="text" v-model="language" :disabled="disabled" @input="createlanguage">' + 
				'</div>' +
				'<textarea class="mdcontent" ref="markdown" v-model="codeblock" :disabled="disabled" @input="createmarkdown"></textarea>' + 
				'</div>',
	data: function(){
		return {
			prefix: '```',
			language: '',
			codeblock: '',
		}
	},
	mounted: function(){
		this.$refs.markdown.focus();
		if(this.compmarkdown)
		{
			var codelines 	= this.compmarkdown.split(/\r\n|\n\r|\n|\r/);
			var linelength 	= codelines.length;
			var codeblock	= '';

			for(i=0;i<linelength;i++)
			{
				if(codelines[i].substring(0,3) == '```')
				{
					if(i==0)
					{
						var prefixlength	= (codelines[i].match(/`/g)).length;						
						this.prefix 		= codelines[i].slice(0, prefixlength);
						this.language 		= codelines[i].replace(/`/g, '');
					}
				}
				else
				{
					this.codeblock += codelines[i] + "\n";
				}
			}
			this.codeblock = this.codeblock.replace(/^\s+|\s+$/g, '');
		}
		this.$nextTick(function () {
			autosize(document.querySelectorAll('textarea'));
			this.$parent.setComponentSize();
		});	
	},
	methods: {
		createlanguage: function()
		{
			var codeblock = this.prefix + this.language + '\n' + this.codeblock + '\n' + this.prefix;
			this.updatemarkdown(codeblock);
		},
		createmarkdown: function(event)
		{
			this.codeblock = event.target.value;
			var codeblock = this.prefix + this.language + '\n' + this.codeblock + '\n' + this.prefix;
			this.updatemarkdown(codeblock);
		},
		updatemarkdown: function(codeblock)
		{
			this.$emit('updatedMarkdown', codeblock);
		},
	},
})

const shortcodeComponent = Vue.component('shortcode-component', {
	props: ['compmarkdown', 'disabled'],
	data: function(){
		return {
			shortcodedata: false,
			shortcodename: '',
			markdown: '',
		}
	},
	template: '<div>' + 
				'<div class="contenttype"><svg class="icon icon-square-brackets"><use xlink:href="#icon-square-brackets"></use></svg></div>' +
				'<div v-if="shortcodedata" class="pa4 bg-tm-gray" ref="markdown">' +
					'<label class="w-20 dib" for="shortcodename">{{ \'Shortcode\'|translate }}: </label>' + 
					'<select class="w-80 dib bg-white" title="shortcodename" v-model="shortcodename" @change="createmarkdown(shortcodename)"><option v-for="shortcode,name in shortcodedata" :value="name">{{ name }}</option></select>' +
					'<div class="mt1 mb1" v-for="key,attribute in shortcodedata[shortcodename]">' +
						'<label class="w-20 dib" for="key">{{ attribute }}: </label>' + 
						'<input class="w-80 dib bg-white" type="search" list="shortcodedata[shortcodename][attribute]" v-model="shortcodedata[shortcodename][attribute].value" @input="createmarkdown(shortcodename,attribute)">' +
						'<datalist id="shortcodedata[shortcodename][attribute]">' + 
						  '<option v-for="item in shortcodedata[shortcodename][attribute].content" @click="selectsearch(item,attribute)" :value="item"></option>' + 
						'</datalist>' +
					'</div>' +
				'</div>' +
				'<textarea v-else class="mdcontent" ref="markdown" placeholder="No shortcodes are registered" disabled></textarea>' +
				'</div>',
	mounted: function(){

		var myself = this;
		
		myaxios.get('/api/v1/shortcodedata',{
	  	params: {
				'url':			document.getElementById("path").value,
				'csrf_name': 	document.getElementById("csrf_name").value,
				'csrf_value':	document.getElementById("csrf_value").value,
			}
		})
		.then(function (response) {
			if(response.data.shortcodedata !== false)
			{
				myself.shortcodedata = response.data.shortcodedata;
				myself.parseshortcode();
			}
		})
		.catch(function (error)
		{
			if(error.response)
	    {

	   	}
		});
	},
	methods: {
		parseshortcode: function()
		{
			if(this.compmarkdown)
			{
				var shortcodestring 	= this.compmarkdown.trim();
				shortcodestring 			= shortcodestring.slice(2,-2);
				this.shortcodename 		= shortcodestring.substr(0,shortcodestring.indexOf(' '));

				var regexp 						= /(\w+)\s*=\s*("[^"]*"|\'[^\']*\'|[^"\'\\s>]*)/g;
				var matches 					= shortcodestring.matchAll(regexp);
				matches 							= Array.from(matches);
				matchlength 					= matches.length;
				
				if(matchlength > 0)
				{
					for(var i=0;i<matchlength;i++)
					{
						var attribute 			= matches[i][1];
						var attributeValue 	= matches[i][2].replaceAll('"','');
				
						this.shortcodedata[this.shortcodename][attribute].value = attributeValue;
					}
				}
			}
		},
		createmarkdown: function(shortcodename,attribute = false)
		{

			var attributes = '';
			if(attribute)
			{
				for (var attribute in this.shortcodedata[shortcodename])
				{
					if(this.shortcodedata[shortcodename].hasOwnProperty(attribute))
					{
				    attributes += ' ' + attribute + '="' +  this.shortcodedata[shortcodename][attribute].value + '"';
					}
				}
			}

			this.markdown = '[:' + shortcodename + attributes + ' :]';

			this.$emit('updatedMarkdown', this.markdown);
		},
		selectsearch: function(item,attribute)
		{
			/* check if still reactive */
			this.shortcodedata[this.shortcodename][attribute].value = item;
			this.createmarkdown(this.shortcodename,attribute);
		},
		updatemarkdown: function(event)
		{
			this.$emit('updatedMarkdown', event.target.value);
		},
	},
})

const quoteComponent = Vue.component('quote-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div>' + 
				'<input type="hidden" ref="markdown" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown" />' +	
				'<div class="contenttype"><svg class="icon icon-quotes-left"><use xlink:href="#icon-quotes-left"></use></svg></div>' +
				'<inline-formats>' +
					'<textarea class="mdcontent" ref="markdown" v-model="quote" :disabled="disabled" @input="updatemarkdown(event.target.value)"></textarea>' + 
				'</inline-formats>' +
			'</div>',
	data: function(){
		return {
			prefix: '> ',
			quote: ''
		}
	},
	mounted: function(){
		this.$refs.markdown.focus();
		if(this.compmarkdown)
		{
			var lines = this.compmarkdown.match(/^.*([\n\r]+|$)/gm);
			for (var i = 0; i < lines.length; i++) {
			    lines[i] = lines[i].replace(/(^[\> ]+)/mg, '');
			}

			this.quote = lines.join('');
		}
		this.$nextTick(function () {
			autosize(document.querySelectorAll('textarea'));
		});
	},
	methods: {
		updatemarkdown: function(value)
		{
			this.quote = value;

			var lines = value.match(/^.*([\n\r]|$)/gm);

			var quote = this.prefix + lines.join(this.prefix);

			this.$emit('updatedMarkdown', quote);
		},
	},
})

const noticeComponent = Vue.component('notice-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div>' + 
				'<input type="hidden" ref="markdown" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown" />' +
				'<div class="contenttype"><svg class="icon icon-exclamation-circle"><use xlink:href="#icon-exclamation-circle"></use></svg></div>' +
				'<button class="hdown" :class="noteclass" @click.prevent="noticedown" v-html="prefix"></button>' +
				'<inline-formats>' +
					'<textarea class="mdcontent pl-notice" ref="markdown" v-model="notice" :disabled="disabled" @input="updatemarkdown(event.target.value)"></textarea>' + 
				'</inline-formats>' +
			'</div>',
	data: function(){
		return {
			prefix: '!',
			notice: '',
			noteclass: 'note1'
		}
	},
	mounted: function(){
		this.$refs.markdown.focus();
		if(this.compmarkdown)
		{
			this.prefix = this.getNoticePrefix(this.compmarkdown);

			var lines = this.compmarkdown.match(/^.*([\n\r]+|$)/gm);
			for (var i = 0; i < lines.length; i++)
			{
			    lines[i] = lines[i].replace(/(^[\! ]+(?!\[))/mg, '');
			}

			this.notice = lines.join('');
			this.noteclass = 'note'+this.prefix.length;
		}
		this.$nextTick(function () {
			autosize(document.querySelectorAll('textarea'));
		});
	},
	methods: {
		noticedown: function()
		{
			this.prefix = this.getNoticePrefix(this.compmarkdown);
			
			/* initially it is empty string, so we add it here if user clicks downgrade button */
			if(this.prefix == '')
			{
				this.prefix = '!';
			}

			this.prefix = this.prefix + '!';
			if(this.prefix.length > 4)
			{
				this.prefix = '!';
			}
			this.noteclass = 'note' + (this.prefix.length);
			this.updatemarkdown(this.notice);
		},
		getNoticePrefix: function(str)
		{
			var prefix = '';
			if(str === undefined)
			{
				return prefix;
			}
			for(var i = 0; i < str.length; i++)
			{
				if(str[i] != '!'){ return prefix }
				prefix += '!';
			}
		  return prefix;
		},
		updatemarkdown: function(value)
		{
			this.notice = value;

			var lines = value.match(/^.*([\n\r]|$)/gm);

			var notice = this.prefix + ' ' + lines.join(this.prefix+' ');

			this.$emit('updatedMarkdown', notice);
		},
	},
})

const ulistComponent = Vue.component('ulist-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div>' + 
				'<div class="contenttype"><svg class="icon icon-list2"><use xlink:href="#icon-list2"></use></svg></div>' +
				'<inline-formats>' +
					'<textarea class="mdcontent" ref="markdown" v-model="compmarkdown" :disabled="disabled" @input="updatemarkdown(event.target.value)"></textarea>' + 
				'</inline-formats>' +
				'</div>',
	mounted: function(){
		this.$refs.markdown.focus();
		if(!this.compmarkdown)
		{
			this.compmarkdown = '* ';
		}
		else
		{
			var lines = this.compmarkdown.split("\n");
			var length = lines.length
			var md = '';

			for(i = 0; i < length; i++)
			{
				var clean = lines[i];
				clean = clean.replace(/^- /, '* ');
				clean = clean.replace(/^\+ /, '* ');
				if(i == length-1)
				{
					md += clean;
				}
				else
				{
					md += clean + '\n';
				}
			}
			this.compmarkdown = md;
		}
		this.$nextTick(function () {
			autosize(document.querySelectorAll('textarea'));
		});	
	},
	methods: {
		updatemarkdown: function(value)
		{
			this.$emit('updatedMarkdown', value);
		},
	},
})

const olistComponent = Vue.component('olist-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div>' + 
				'<div class="contenttype"><svg class="icon icon-list-numbered"><use xlink:href="#icon-list-numbered"></use></svg></div>' +
				'<inline-formats>' +
					'<textarea class="mdcontent" ref="markdown" v-model="compmarkdown" :disabled="disabled" @input="updatemarkdown(event.target.value)"></textarea>' + 
				'</inline-formats>' +
				'</div>',
	mounted: function(){
		this.$refs.markdown.focus();
		if(!this.compmarkdown)
		{
			this.compmarkdown = '1. ';
		}
		this.$nextTick(function () {
			autosize(document.querySelectorAll('textarea'));
		});
	},
	methods: {
		updatemarkdown: function(value)
		{
			this.$emit('updatedMarkdown', value);
		},
	},
})

const headlineComponent = Vue.component('headline-component', { 
	props: ['compmarkdown', 'disabled'],
	template: '<div>' + 
				'<div class="contenttype"><svg class="icon icon-header"><use xlink:href="#icon-header"></use></svg></div>' +
				'<button class="hdown headline" @click.prevent="headlinedown" v-html="level"></button>' +
				'<input class="mdcontent" :class="hlevel" type="text" ref="markdown" v-model="compmarkdown" :disabled="disabled" @input="updatemarkdown">' +
				'</div>',
	data: function(){
			return {
				level: '',
				hlevel: '',
			}
		},
	mounted: function(){
		this.$refs.markdown.focus();
		if(!this.compmarkdown)
		{
			this.compmarkdown = '## ';
			this.level = '2';
			this.hlevel = 'h2';
		}
		else
		{
			this.level = this.getHeadlineLevel(this.compmarkdown);
			this.hlevel = 'h' + this.level;
		}
	},
	methods: {
		updatemarkdown: function(event)
		{
			var headline = event.target.value;
			this.level = this.getHeadlineLevel(headline);
			if(this.level > 6)
			{
				headline = '######' + headline.substr(this.level);
				this.level = 6;
				this.compmarkdown = headline;
			}
			else if(this.level < 2)
			{
				headline = '##' + headline.substr(this.level);
				this.level = 2;
				this.compmarkdown = headline;
			}
			this.hlevel = 'h' + this.level;
			this.$emit('updatedMarkdown', headline);
		},
		headlinedown: function()
		{
			this.level = this.getHeadlineLevel(this.compmarkdown);
			if(this.level < 6)
			{
				this.compmarkdown = this.compmarkdown.substr(0, this.level) + '#' + this.compmarkdown.substr(this.level);
				this.level = this.level+1;
				this.hlevel = 'h' + this.level;	
			}
			else
			{
				this.compmarkdown = '##' + this.compmarkdown.substr(this.level);
				this.level = 2;
				this.hlevel = 'h2';				
			}
			this.$emit('updatedMarkdown', this.compmarkdown);
		},
		getHeadlineLevel: function(str)
		{
			var count = 0;
			for(var i = 0; i < str.length; i++){
				if(str[i] != '#'){ return count }
				count++;
			}
		  return count;
		},
	},
})

const tableComponent = Vue.component('table-component', { 
	props: ['compmarkdown', 'disabled'],
	data: function(){
		return {
			table: [
				['0', '1', '2'],
				['1', 'Head', 'Head'],
				['2', 'cell', 'cell'],
				['3', 'cell', 'cell'],
			],
			editable: 'editable',
			noteditable: 'noteditable',
			cellcontent: '',
			columnbar: false,
			rowbar: false,
			tablekey: 1,
		}
	},
	template: '<div ref="table" :key="tablekey">' + 
				'<div class="contenttype"><svg class="icon icon-table2"><use xlink:href="#icon-table2"></use></svg></div>' +
				'<table ref="markdown">' +
					'<colgroup>' +
						'<col v-for="col in table[0]">' +
					'</colgroup>' +
					'<tbody>' +
						'<tr v-for="(row, rowindex) in table">' +
							'<td v-if="rowindex === 0" v-for="(value,colindex) in row" contenteditable="false" class="noteditable" @click="switchcolumnbar(value)"  @keydown.13.prevent="enter">{{value}} ' +
							  '<div v-if="columnbar === value" class="columnaction">' + 
							     '<div class="actionline" @click="addrightcolumn(value)">{{ \'add right column\'|translate }}</div>' +
								 '<div class="actionline" @click="addleftcolumn(value)">{{ \'add left column\'|translate }}</div>' +
								 '<div class="actionline" @click="deletecolumn(value)">{{ \'delete column\'|translate }}</div>' +							
							  '</div>' +
							'</td>' +
							'<th v-if="rowindex === 1" v-for="(value,colindex) in row" :contenteditable="colindex !== 0 ? true : false" @click="switchrowbar(value)" @keydown.13.prevent="enter" @blur="updatedata($event,colindex,rowindex)" :class="colindex !== 0 ? editable : noteditable">' + 
							 '<div v-if="colindex === 0 && rowbar === value" class="rowaction">' + 
 								 '<div class="actionline" @click="addaboverow(value)">{{ \'add row above\'|translate }}</div>' +
								 '<div class="actionline" @click="addbelowrow(value)">{{ \'add row below\'|translate }}</div>' +
								 '<div class="actionline" @click="deleterow(value)">{{ \'delete row\'|translate }}</div>' +						
							  '</div>' + 
							'{{ value }}</th>' +
							'<td v-if="rowindex > 1" v-for="(value,colindex) in row" :contenteditable="colindex !== 0 ? true : false" @click="switchrowbar(value)" @keydown.13.prevent="enter" @blur="updatedata($event,colindex,rowindex)" :class="colindex !== 0 ? editable : noteditable">' + 
							 '<div v-if="colindex === 0 && rowbar === value" class="rowaction">' + 
  								 '<div class="actionline" @click="addaboverow(value)">{{ \'add row above\'|translate }}</div>' +
								 '<div class="actionline" @click="addbelowrow(value)">{{ \'add row below\'|translate }}</div>' +
								 '<div class="actionline" @click="deleterow(value)">{{ \'delete row\'|translate }}</div>' +
							  '</div>' +
							'{{ value }}</td>' +
						'</tr>' +
					'</tbody>' +
				'</table>' +
				'</div>',
	mounted: function(){
		this.$refs.markdown.focus();
		if(this.compmarkdown)
		{
			var table = [];
			var lines = this.compmarkdown.split("\n");
			var length = lines.length
			var c = 1;
			
			for(i = 0; i < length; i++)
			{
				if(i == 1){ continue }
				
				var line = lines[i].trim();
				var row = line.split("|").map(function(cell){
					return cell.trim();
				});
				if(row[0] == ''){ row.shift() }
				if(row[row.length-1] == ''){ row.pop() }
				if(i == 0)
				{
					var rlength = row.length;
					var row0 = [];
					for(y = 0; y <= rlength; y++) { row0.push(y) }
					table.push(row0);
				}
				row.splice(0,0,c);
				c++;
				table.push(row);
			}
			this.table = table;
		}
	},
	methods: {
		enter: function()
		{
			return false;
		},
		updatedata: function(event,col,row)
		{
			this.table[row][col] = event.target.innerText;			
			this.markdowntable();
		},
		switchcolumnbar(value)
		{
			this.rowbar = false;
			(this.columnbar == value || value == 0) ? this.columnbar = false : this.columnbar = value;
		},
		switchrowbar(value)
		{
			this.columnbar = false;
			(this.rowbar == value || value == 0 || value == 1 )? this.rowbar = false : this.rowbar = value;
		},
		addaboverow: function(index)
		{
			var row = [];
			var cols = this.table[0].length;
			for(var i = 0; i < cols; i++){ row.push("new"); }
			this.table.splice(index,0,row);
			this.reindexrows();
		},
		addbelowrow: function(index)
		{
			var row = [];
			var cols = this.table[0].length;
			for(var i = 0; i < cols; i++){ row.push("new"); }
			this.table.splice(index+1,0,row);
			this.reindexrows();
		},
		deleterow: function(index)
		{
			this.table.splice(index,1);
			this.reindexrows();
		},
		addrightcolumn: function(index)
		{
			var tableLength = this.table.length;
			for (var i = 0; i < tableLength; i++)
			{
				this.table[i].splice(index+1,0,"new");
			}
			this.reindexcolumns();
		},
		addleftcolumn: function(index)
		{
			var tableLength = this.table.length;
			for (var i = 0; i < tableLength; i++)
			{
				this.table[i].splice(index,0,"new");
			}
			this.reindexcolumns();
		},
		deletecolumn: function(index)
		{
			var tableLength = this.table.length;
			for (var i = 0; i < tableLength; i++)
			{
				this.table[i].splice(index,1);
			}
			this.reindexcolumns();
		},
		reindexrows: function()
		{
			var tableRows = this.table.length;
			for (var i = 0; i < tableRows; i++)
			{
				Vue.set(this.table[i], 0, i);
			}
			this.tablekey +=1;
			this.markdowntable();
		},
		reindexcolumns: function()
		{
			var tableColumns = this.table[0].length;
			for (var i = 0; i < tableColumns; i++)
			{
				Vue.set(this.table[0], i, i);
			}
			this.tablekey +=1;
			this.markdowntable();
		},
		markdowntable: function()
		{
			var markdown = '';
			var separator = '\n|';
			var rows = this.table.length;
			var cols = this.table[0].length;
			
			for(var i = 0; i < cols; i++)
			{
				if(i == 0){ continue; }
				separator += '---|';
			}
			
			for(var i = 0; i < rows; i++)
			{
				var row = this.table[i];

				if(i == 0){ continue; }
				
				for(var y = 0; y < cols; y++)
				{					
					if(y == 0){ continue; }
					
					var value = row[y].trim();
					
					if(y == 1)
					{
						markdown += '\n| ' + value + ' | ';
					}
					else
					{
						markdown += value + ' | ';
					}
				}
				if(i == 1) { markdown = markdown + separator; }
			}
			this.$emit('updatedMarkdown', markdown);
		},
		updatemarkdown: function(event)
		{
			this.$emit('updatedMarkdown', event.target.value);
		},
	},
})

const definitionComponent = Vue.component('definition-component', {
	props: ['compmarkdown', 'disabled', 'load'],
	data: function(){
		return {
			definitionList: [],
		}
	},
	template: '<div class="definitionList">' +
							'<div class="contenttype"><svg class="icon icon-dots-two-vertical"><use xlink:href="#icon-dots-two-vertical"></use></svg></div>' +
							'<draggable v-model="definitionList" :animation="150" @end="moveDefinition">' +
	  			    	'<div class="definitionRow relative" v-for="(definition, dtindex) in definitionList" :key="definition.id">' +
									'<div class="definitionTerm">' + 
										'<svg class="icon icon-arrows-v"><use xlink:href="#icon-arrows-v"></use></svg>' +
										'<input type="text" class="w-90" v-bind:placeholder="\'term\'|translate" :value="definition.term" :disabled="disabled" @input="updateterm($event,dtindex)" @blur="updateMarkdown">' +
			  		  		'</div>' +
			  		  		'<div class="dib w-60">' +
				  		  		'<div class="flex" v-for="(description,ddindex) in definition.descriptions">' +
					  		  		'<svg class="icon icon-dots-two-vertical"><use xlink:href="#icon-dots-two-vertical"></use></svg>' + 
				  			  		'<textarea class="w-90" v-bind:placeholder="\'description\'|translate" v-html="definition.descriptions[ddindex]" :disabled="disabled" @input="updatedescription($event, dtindex, ddindex)" @keydown.13.prevent="enter" @blur="updateMarkdown"></textarea>' +
					  					'<button title="delete description" class="ba bw1 b--tm-gray white bg-tm-red w2 h2 f7 lh-solid dim" @click.prevent="deleteItem(dtindex,ddindex)"><svg class="icon icon-minus baseline"><use xlink:href="#icon-minus"></use></svg></button>' +
				  					'</div>' +
				  					'<button title="add description" class="ml3 ba bw1 b--tm-gray white bg-tm-green w2 h2 f7 lh-solid dim" @click.prevent="addItem(dtindex)"><svg class="icon icon-plus"><use xlink:href="#icon-plus"></use></svg></button>' +
			  					'</div>' +
									'<button title="delete definition" class="absolute top-1 right-2 bottom-1 tc pa2 ba br1 b--tm-red tm-red bg-tm-gray hover-bg-tm-red hover-white" @click.prevent="deleteDefinition(dtindex)">x</button>' +
								'<hr></div>' +
							'</draggable>' +
							'<button class="ml3 mb3 mr1 ba bw1 b--tm-gray white bg-tm-green w2 h2 f7 lh-solid dim" @click.prevent="addDefinition()"><svg class="icon icon-plus"><use xlink:href="#icon-plus"></use></svg></button><span class="f6">{{ \'add definition\'|translate }}</span>' +
							'<div v-if="load" class="loadwrapper"><span class="load"></span></div>' +
						'</div>',
	mounted: function(){
		if(this.compmarkdown)
		{
			var definitionList 	= this.compmarkdown.replace("\r\n", "\n");
			definitionList 			= definitionList.replace("\r", "\n");
			definitionList 			= definitionList.split("\n\n");

			for(var i=0; i < definitionList.length; i++)
			{
				var definitionBlock 	= definitionList[i].split("\n");
				var term 							= definitionBlock[0];
				var descriptions 			= [];
				var description 			= false;

				/* parse one or more descriptions */
				for(var y=0; y < definitionBlock.length; y++)
				{
					if(y == 0)
					{
						continue;
					}

					if(definitionBlock[y].substring(0, 2) == ": ")
					{
						/* if there is another description in the loop, then push that first then start a new one */
						if(description)
						{
							descriptions.push(description);
						}
						var cleandefinition = definitionBlock[y].substr(1).trim();
						var description = cleandefinition;
					}
					else
					{
						description += "\n" + definitionBlock[y];
					}
				}

				if(description)
				{
					descriptions.push(description);
				}
				this.definitionList.push({'term': term ,'descriptions': descriptions, 'id': i});					
			}
		}
		else
		{
			this.addDefinition();
		}
	},
	methods: {
		enter: function()
		{
			return false;
		},
		updateterm: function(event, dtindex)
		{
			this.definitionList[dtindex].term = event.target.value;
		},
		updatedescription: function(event, dtindex, ddindex)
		{
			this.definitionList[dtindex].descriptions[ddindex] = event.target.value;
		},
		addDefinition: function()
		{
			var id = this.definitionList.length;
			this.definitionList.push({'term': '', 'descriptions': [''], 'id': id});
		},
		deleteDefinition: function(dtindex)
		{
			this.definitionList.splice(dtindex,1);
			this.updateMarkdown();
		},
		addItem: function(dtindex)
		{
			this.definitionList[dtindex].descriptions.push('');
		},
		deleteItem: function(dtindex,ddindex)
		{
			this.definitionList[dtindex].descriptions.splice(ddindex,1);
			this.updateMarkdown();
		},
		moveDefinition: function(evt)
		{
			this.updateMarkdown();
		},
		updateMarkdown: function()
		{
			var dllength = this.definitionList.length;
			var markdown = '';

			for(i = 0; i < dllength; i++)
			{
				markdown = markdown + this.definitionList[i].term;
				var ddlength 	= this.definitionList[i].descriptions.length;
				for(y = 0; y < ddlength; y++)
				{
					markdown = markdown + "\n:   " + this.definitionList[i].descriptions[y];
				}
				markdown = markdown + "\n\n";
			}
			this.$emit('updatedMarkdown', markdown);
		},
	},
})

const videoComponent = Vue.component('video-component', {
	props: ['compmarkdown', 'disabled', 'load'],
	template: '<div class="video dropbox">' +
				'<div class="contenttype"><svg class="icon icon-play"><use xlink:href="#icon-play"></use></svg></div>' +
					'<label for="video">{{ \'Link to video\'|translate }}: </label><input type="url" ref="markdown" placeholder="https://www.youtube.com/watch?v=" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown">' +
					'<div v-if="load" class="loadwrapper"><span class="load"></span></div>' +
				'</div>',
	mounted: function(){

		this.$refs.markdown.focus();

		if(this.compmarkdown)
		{
			var videoid = this.compmarkdown.match(/#.*? /);
			if(videoid)
			{
				var event = { 'target': { 'value': 'https://www.youtube.com/watch?v=' + videoid[0].trim().substring(1) }};
				this.updatemarkdown(event);
			}
		}
	},				
	methods: {
		updatemarkdown: function(event)
		{
			this.$emit('updatedMarkdown', event.target.value);
		},
	},
})

const imageComponent = Vue.component('image-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div class="dropbox">' +
				'<input type="hidden" ref="markdown" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown" />' +
				'<div class="imageupload">' + 
					'<input type="file" name="image" accept="image/*" class="input-file" @change="onFileChange( $event )" /> ' +
					'<p><svg class="icon icon-upload baseline"><use xlink:href="#icon-upload"></use></svg> {{ \'drag a picture or click to select\'|translate }}</p>' +
				'</div>' +
				'<button class="imageselect" @click.prevent="openmedialib()"><svg class="icon icon-image baseline"><use xlink:href="#icon-image"></use></svg> {{ \'select from medialib\'|translate }}</button>' +
				'<transition name="fade-editor">' +
					'<div v-if="showmedialib" class="modalWindow">' +
						'<medialib parentcomponent="images"></medialib>' + 
					'</div>' +
				'</transition>' +
				'<div class="contenttype"><svg class="icon icon-image"><use xlink:href="#icon-image"></use></svg></div>' +	
				'<img class="uploadPreview" :src="imgpreview" />' +
				'<div v-if="load" class="loadwrapper"><span class="load"></span></div>' +
				'<div class="imgmeta" v-if="imgmeta">' +
					'<label for="imgalt">{{ \'Alt-Text\'|translate }}: </label><input name="imgalt" type="text" placeholder="alt" @input="createmarkdown" v-model="imgalt" max="100" />' +
					'<label for="imgtitle">{{ \'Title\'|translate }}: </label><input name="imgtitle" type="text" placeholder="title" v-model="imgtitle" @input="createmarkdown" max="64" />' +
					'<label for="imgcaption">{{ \'Caption\'|translate }}: </label><input title="imgcaption" type="text" placeholder="caption" v-model="imgcaption" @input="createmarkdown" max="140" />' +
					'<label for="imgurl">{{ \'Link\'|translate }}: </label><input title="imgurl" type="url" placeholder="url" v-model="imglink" @input="createmarkdown" />' +
					'<label for="imgclass">{{ \'Class\'|translate }}: </label><select title="imgclass" v-model="imgclass" @change="createmarkdown"><option value="center">{{ \'Center\'|translate }}</option><option value="left">{{ \'Left\'|translate }}</option><option value="right">{{ \'Right\'|translate }}</option></select>' +
					'<label for="imgsizes">{{ \'width/height\'|translate }}: </label><div class="imgsizes dib w-40"><input style="width:100%" title="imgwidth" type="text" :placeholder="originalwidth" v-model="imgwidth" @input="changewidth" max="6" /></div><div class="imgsizes dib w-40"><input style="width:100%" title="imgheight" type="text" :placeholder="originalheight" v-model="imgheight" @input="changeheight" max="6" /></div>'+
					'<label v-if="showresize" class="control-group imgcheckmark">{{ \'Do not resize\'|translate }}:<input title="saveoriginal" class="checkbox" type="checkbox" v-model="noresize" @change="createmarkdown" /><span class="checkmark"></span></label>' +
					'<input title="imgid" type="hidden" placeholder="id" v-model="imgid" @input="createmarkdown" max="140" />' +
				'</div></div>',
	data: function(){
		return {
			maxsize: 5, // megabyte
			imgpreview: false,
			showmedialib: false,
			load: false,
			imgmeta: false,
			imgalt: '',
			imgtitle: '',
			imgcaption: '',
			imglink: '',
			imgclass: 'center',
			imgid: '',
			imgwidth: 0,
			imgheight: 0,
			originalwidth: 0,
			originalheight: 0,
			imgloading: 'lazy',
			imagestandardwidth: 820,
			imgattr: '',
			imgfile: '',
			showresize: true,
			noresize: false,
		}
	},
	mounted: function(){

		if(this.isInt(imagestandardwidth))
		{
			this.imagestandardwidth = imagestandardwidth;
		}
		
		this.$refs.markdown.focus();

		if(this.compmarkdown)
		{
			this.showresize 		= false;

			this.imgmeta 				= true;
			
			var imgmarkdown 		= this.compmarkdown;

			var imgcaption 			= imgmarkdown.match(/\*.*?\*/);
			if(imgcaption)
			{
				this.imgcaption 	= imgcaption[0].slice(1,-1);
				
				imgmarkdown 			= imgmarkdown.replace(this.imgcaption,'');
				imgmarkdown 			= imgmarkdown.replace(/\r?\n|\r/g,'');
			
			}

			if(this.compmarkdown[0] == '[')
			{
				var imglink 			= this.compmarkdown.match(/\(.*?\)/g);
				if(imglink[1])
				{
					this.imglink 		= imglink[1].slice(1,-1);
					
					imgmarkdown 		= imgmarkdown.replace(imglink[1],'');
					imgmarkdown 		= imgmarkdown.slice(1, -1);
					
				}
			}
						
			var imgalt 					= imgmarkdown.match(/\[.*?\]/);
			if(imgalt)
			{
				this.imgalt 			= imgalt[0].slice(1,-1);
			}
			
			var imgattr 				= imgmarkdown.match(/\{.*?\}/);
			if(imgattr)
			{
				imgattr 					= imgattr[0].slice(1,-1);
				imgattr 					= imgattr.trim();
				imgattr 					= imgattr.split(' ');
				
				var widthpattern 	= /width=\"?([0-9]*)[a-zA-Z%]*\"?/;
				var heightpattern	= /height=\"?([0-9]*)[a-zA-Z%]*\"?/;
				var lazypattern 	= /loading=\"?([0-9a-zA-Z]*)\"?/;

				for (var i = 0; i < imgattr.length; i++)
				{
					var widthattr 	= imgattr[i].match(widthpattern);
					var heightattr 	= imgattr[i].match(heightpattern);
					var lazyattr 		= imgattr[i].match(lazypattern);

					if(imgattr[i].charAt(0) == '.')
					{
						this.imgclass		= imgattr[i].slice(1);
					}
					else if(imgattr[i].charAt(0)  == '#')
					{
						this.imgid 			= imgattr[i].slice(1);
					}
					else if(widthattr)
					{
						this.imgwidth		= parseInt(widthattr[1]);
					}
					else if(heightattr)
					{
						this.imgheight 	= parseInt(heightattr[1]);
					}
					else if(lazyattr && lazyattr[1] != '')
					{
						this.imgloading	= lazyattr[1];
					}
					else
					{
						this.imgattr += ' ' + imgattr[i];
					}
				}
			}

			var imgfile 				= imgmarkdown.match(/\(.*?\)/);
			if(imgfile)
			{
				imgfilestring 		= imgfile[0];
				var imgtitle 			= imgfilestring.match(/\".*?\"/);
				if(imgtitle)
				{
					this.imgtitle 	= imgtitle[0].slice(1,-1);
					imgfilestring 	= imgfilestring.replace(imgtitle[0], '');
				}

				this.imgfile 			= imgfilestring.slice(1,-1).trim();
				this.imgpreview 	= this.$root.$data.root + '/' + this.imgfile;
			}
			
			this.createmarkdown();
		}
	},
	methods: {
		isInt: function(value) {
		  return !isNaN(value) && 
		         parseInt(Number(value)) == value && 
		         !isNaN(parseInt(value, 10));
		},
		createmarkdown: function()
		{
			if(this.imgpreview)
			{
				var img = new Image();
				img.src = this.imgpreview;

				var self = this;

				img.onload = function(){

					  self.originalwidth 		= img.width;
					  self.originalheight 	= img.height;
					  self.originalratio 		= self.originalwidth / self.originalheight;

					  self.calculatewidth();
					  self.calculateheight();
					  if(self.imgwidth > self.imagestandardwidth)
					  {
					  	self.imgwidth = self.imagestandardwidth;
					  	self.calculateheight();
					  }
						self.createmarkdownimageloaded();
				}
			}
			else
			{
				this.createmarkdownimageloaded();
			}
		},
		calculatewidth: function()
		{
			this.setdefaultsize();
			if(this.imgheight && this.imgheight > 0)
			{
				this.imgwidth = Math.round(this.imgheight * this.originalratio);
			}
			else
			{
				this.imgwidth = '';
			}
		},
		calculateheight: function()
		{
			this.setdefaultsize();
			if(this.imgwidth && this.imgwidth > 0)
			{
				this.imgheight = Math.round(this.imgwidth / this.originalratio);
			}
			else
			{
				this.imgheight = '';
			}
		},
		setdefaultsize: function()
		{
			if(this.imgheight == 0 && this.imgwidth == 0)
			{
				this.imgwidth = this.originalwidth;
				this.imgheight = this.originalheight;
			}
		},
		changewidth: function()
		{
			this.calculateheight();
			this.createmarkdownimageloaded();
		},
		changeheight: function()
		{
			this.calculatewidth();
			this.createmarkdownimageloaded();
		},
		openmedialib: function()
		{
			this.showresize 	= false;
			this.noresize 		= false;
			this.showmedialib = true;
		},
		isChecked: function(classname)
		{
			if(this.imgclass == classname)
			{
				return ' checked';
			}
		},
		updatemarkdown: function(event)
		{
			this.$emit('updatedMarkdown', event.target.value);
		},		
		createmarkdownimageloaded: function()
		{
			var errors = false;
			
			if(this.imgalt.length < 101)
			{
				imgmarkdown = '![' + this.imgalt + ']';
			}
			else
			{
				errors = 'Maximum size of image alt-text is 100 characters';
				imgmarkdown = '![]';
			}
			
			if(this.imgtitle != '')
			{
				if(this.imgtitle.length < 101)
				{
					imgmarkdown = imgmarkdown + '(' + this.imgfile + ' "' + this.imgtitle + '")';
				}
				else
				{
					errors = 'Maximum size of image title is 100 characters';
				}
			}
			else
			{
				imgmarkdown = imgmarkdown + '(' + this.imgfile + ')';		
			}
			
			var imgattr = '';

			if(this.imgid != '')
			{
				if(this.imgid.length < 100)
				{
					imgattr = imgattr + ' #' + this.imgid; 
				}
				else
				{
					errors = 'Maximum size of image id is 100 characters';
				}
			}
			if(this.imgclass != '')
			{
				if(this.imgclass.length < 100)
				{
					imgattr = imgattr + ' .' + this.imgclass; 
				}
				else
				{
					errors = 'Maximum size of image class is 100 characters';
				}
			}
			if(this.imgloading != '')
			{
				imgattr = imgattr + ' loading="' + this.imgloading + '"';
			}			
			if(this.imgwidth != '')
			{
				imgattr = imgattr + ' width="' + this.imgwidth + '"';
			}
			if(this.imgheight != '')
			{
				imgattr = imgattr + ' height="' + this.imgheight + '"';
			}			
			if(this.imgattr != '')
			{
				imgattr += this.imgattr;
			}
			if(imgattr != '')
			{
				imgmarkdown = imgmarkdown + '{' + imgattr.trim() + '}';
			}
			
			if(this.imglink != '')
			{
				if(this.imglink.length < 101)
				{
					imgmarkdown = '[' + imgmarkdown + '](' + this.imglink + ')';
				}
				else
				{
					errors = 'Maximum size of image link is 100 characters';
				}
			}

			if(this.imgcaption != '')
			{
				if(this.imgcaption.length < 140)
				{
					imgmarkdown = imgmarkdown + '\n*' + this.imgcaption + '*'; 
				}
				else
				{
					errors = 'Maximum size of image caption is 140 characters';
				}
			}
			
			if(this.noresize === true)
			{
				imgmarkdown = imgmarkdown + '|noresize';
			}

			if(errors)
			{
				this.$parent.freezePage();
				publishController.errors.message = errors;
			}
			else
			{
				publishController.errors.message = false;
				this.$parent.activatePage();
				this.$emit('updatedMarkdown', imgmarkdown);
			}
		},
		onFileChange: function( e )
		{
			if(e.target.files.length > 0)
			{
				let imageFile = e.target.files[0];
				let size = imageFile.size / 1024 / 1024;
				
				if (!imageFile.type.match('image.*'))
				{
					publishController.errors.message = "Only images are allowed.";
				} 
				else if (size > this.maxsize)
				{
					publishController.errors.message = "The maximal size of images is " + this.maxsize + " MB";
				}
				else
				{
					self = this;
					
					self.$parent.freezePage();
					self.$root.$data.file 	= true;
					self.load 							= true;
					self.showresize 				= true;
					self.noresize 					= false;

					let reader = new FileReader();
					reader.readAsDataURL(imageFile);
					reader.onload = function(e) {

						self.imgpreview = e.target.result;
						
						self.createmarkdown();

				    myaxios.post('/api/v1/image',{
							'url':				document.getElementById("path").value,
							'image':			e.target.result,
							'name': 			imageFile.name, 
							'csrf_name': 		document.getElementById("csrf_name").value,
							'csrf_value':		document.getElementById("csrf_value").value,
						})
				    .then(function (response) {
							
							self.load = false;
							self.$parent.activatePage();

							self.imgmeta = true;
							self.imgfile = response.data.name;
							self.$emit('updatedMarkdown', '![]('+ response.data.name +')');								
				    })
				    .catch(function (error)
				    {
				      /*
							if(httpStatus == 400)
							{
								self.activatePage();
								publishController.errors.message = "Looks like you are logged out. Please login and try again.";
							}
							*/
				      
				      if(error.response)
				      {
				        publishController.errors.message = error.response.data.errors.message;
				      }

				    });
					}
				}
			}
		}
	}
})

const fileComponent = Vue.component('file-component', {
	props: ['compmarkdown', 'disabled'],
	template: '<div class="dropbox">' +
				'<input type="hidden" ref="markdown" :value="compmarkdown" :disabled="disabled" @input="updatemarkdown" />' +
				'<div class="imageupload">' + 
					'<input type="file" accept="*" name="file" class="input-file" @change="onFileChange( $event )" /> ' +
					'<p><svg class="icon icon-upload baseline"><use xlink:href="#icon-upload"></use></svg> {{ \'upload file\'|translate }}</p>' +
				'</div>' +
				'<button class="imageselect" @click.prevent="openmedialib()"><svg class="icon icon-paperclip baseline"><use xlink:href="#icon-paperclip"></use></svg> {{ \'select from medialib\'|translate }}</button>' +
				'<transition name="fade-editor">' +
					'<div v-if="showmedialib" class="modalWindow">' +
						'<medialib parentcomponent="files"></medialib>' + 
					'</div>' +
				'</transition>' +
				'<div class="contenttype"><svg class="icon icon-paperclip"><use xlink:href="#icon-paperclip"></use></svg></div>' +
				'<div v-if="load" class="loadwrapper"><span class="load"></span></div>' +
				'<div class="imgmeta relative" v-if="filemeta">' +
				  '<label for="filetitle">{{ \'Title\'|translate }}: </label>' + 
				  '<input name="filetitle" type="text" placeholder="Add a title for the download-link" v-model="filetitle" @input="createmarkdown" max="64" />' + 
				  '<input title="fileid" type="hidden" placeholder="id" v-model="fileid" @input="createmarkdown" max="140" />' +
				  '<label for="filerestriction">{{ \'Access for\'|translate }}: </label>' +
				  '<select name="filerestriction" v-model="selectedrole" @change="updaterestriction">' +
				  	'<option disabled value="">{{ \'Please select\'|translate }}</option>' +
						'<option v-for="role in userroles">{{ role }}</option>' +
					'</select>' +
  			'</div></div>',
	data: function(){
		return {
			maxsize: maxuploadsize, // megabyte
			showmedialib: false,
			load: false,
			filemeta: false,
			filetitle: '',
			fileextension: '',
			fileurl: '',
			fileid: '',
			userroles: ['all'],
			selectedrole: '',
		}
	},
	mounted: function(){
		this.$refs.markdown.focus();

		if(this.compmarkdown)
		{
			this.filemeta = true;
			
			var filemarkdown = this.compmarkdown;
			
			var filetitle = filemarkdown.match(/\[.*?\]/);
			if(filetitle)
			{
				filemarkdown = filemarkdown.replace(filetitle[0],'');
				this.filetitle = filetitle[0].slice(1,-1);
			}

			var fileattr = filemarkdown.match(/\{.*?\}/);
			var fileextension = filemarkdown.match(/file-(.*)?\}/);
			if(fileattr && fileextension)
			{
				filemarkdown = filemarkdown.replace(fileattr[0],'');
				this.fileextension = fileextension[1].trim();
			}

			var fileurl = filemarkdown.match(/\(.*?\)/g);
			if(fileurl)
			{
				filemarkdown = filemarkdown.replace(fileurl[0],'');
				this.fileurl = fileurl[0].slice(1,-1);
			}
		}

		this.getrestriction();
	},
	methods: {
		openmedialib: function()
		{
			this.showmedialib = true;
		},
		isChecked: function(classname)
		{
			if(this.fileclass == classname)
			{
				return ' checked';
			}
		},
		updatemarkdown: function(event, url)
		{
			this.$emit('updatedMarkdown', event.target.value);
			this.getrestriction(url);
		},
		createmarkdown: function()
		{
			var errors = false;
			
			if(this.filetitle.length < 101)
			{
				filemarkdown = '[' + this.filetitle + ']';
			}
			else
			{
				errors = 'Maximum size of file-text is 100 characters';
				filemarkdown = '[]';
			}
			if(this.fileurl != '')
			{
				if(this.fileurl.length < 101)
				{
					filemarkdown = '[' + this.filetitle + '](' + this.fileurl + ')';
				}
				else
				{
					errors = 'Maximum size of file link is 100 characters';
				}
			}
			if(this.fileextension != '')
			{
				filemarkdown = filemarkdown + '{.tm-download file-' + this.fileextension + '}';
			}
			if(errors)
			{
				this.$parent.freezePage();
				publishController.errors.message = errors;
			}
			else
			{
				publishController.errors.message = false;
				this.$parent.activatePage();
				this.$emit('updatedMarkdown', filemarkdown);
			}
		},
		getrestriction: function(url)
		{
			var fileurl = this.fileurl;
			if(url)
			{
				fileurl = url;
			}

			var myself = this;

	    myaxios.get('/api/v1/filerestrictions',{
	      params: {
					'url':			document.getElementById("path").value,
					'csrf_name': 	document.getElementById("csrf_name").value,
					'csrf_value':	document.getElementById("csrf_value").value,
					'filename': fileurl,
	      }
			})
	    .then(function (response) {
	    	myself.userroles 		= ['all'];
	    	myself.userroles 		= myself.userroles.concat(response.data.userroles);
	    	myself.selectedrole	= response.data.restriction;
	    })
	    .catch(function (error)
	    {
	      if(error.response)
	      {
	      }
	    });
		},
		updaterestriction: function()
		{
	    myaxios.post('/api/v1/filerestrictions',{
					'url':			document.getElementById("path").value,
					'csrf_name': 	document.getElementById("csrf_name").value,
					'csrf_value':	document.getElementById("csrf_value").value,
					'filename': this.fileurl,
					'role': this.selectedrole,
			})
	    .then(function (response) {
	    	
	    })
	    .catch(function (error)
	    {
	      if(error.response)
	      {
	      }
	    });
		},
		onFileChange: function( e )
		{
			if(e.target.files.length > 0)
			{
				let uploadedFile = e.target.files[0];
				let size = uploadedFile.size / 1024 / 1024;
				
				if (size > this.maxsize)
				{
					publishController.errors.message = "The maximal size of a file is " + this.maxsize + " MB";
				}
				else
				{
					self = this;
					
					self.$parent.freezePage();
					self.$root.$data.file = true;
					self.load = true;

					let reader = new FileReader();
					reader.readAsDataURL(uploadedFile);
					reader.onload = function(e) {
						
				    myaxios.post('/api/v1/file',{
							'url':				document.getElementById("path").value,
							'file':				e.target.result,
							'name': 			uploadedFile.name, 
							'csrf_name': 		document.getElementById("csrf_name").value,
							'csrf_value':		document.getElementById("csrf_value").value,
						})
				    .then(function (response) {
							self.load = false;
							self.$parent.activatePage();
								
							self.filemeta 			= true;
							self.filetitle 			= response.data.info.title;
							self.fileextension 	= response.data.info.extension;
							self.fileurl 				= response.data.info.url;
							self.selectedrole 	= '';
							
							self.createmarkdown();
				    })
				    .catch(function (error)
				    {
							self.load = false;
							self.$parent.activatePage();
				      if(error.response)
				      {
				        publishController.errors.message = error.response.data.errors;
				      }
				    });
					}
				}
			}
		}
	}
})


let activeFormats = [];

for(var i = 0; i < formatConfig.length; i++)
{
	if(bloxFormats[formatConfig[i]] !== undefined)
	{
		activeFormats.push(bloxFormats[formatConfig[i]]);
	}
}

let editor = new Vue({  
	delimiters: ['${', '}'],
	el: '#blox',
	data: {
		errors: [],
		root: document.getElementById("main").dataset.url,
		html: false,
		title: false,
		markdown: false,
		blockId: false,
		blockType: false,
		blockMarkdown: false,
		file: false,
		freeze: false,
		unsafed: false,
		newBlocks: [],
		addblock: false,
		draftDisabled: true,
		bloxOverlay: false,
		sortdisabled: false,
		showEditor: 'show',
		formats: activeFormats,
	},
	mounted: function(){

		publishController.visual = true;

		var self = this;

	    myaxios.post('/api/v1/article/html',{
				'url':				document.getElementById("path").value,
				'csrf_name': 		document.getElementById("csrf_name").value,
				'csrf_value':		document.getElementById("csrf_value").value,
			})
	    .then(function (response){
				var contenthtml 	= response.data.data;
				self.title 			= contenthtml[0];
				self.html 			= contenthtml;
				var initialcontent 	= document.getElementById("initial-content");
			
				initialcontent.parentNode.removeChild(initialcontent);  
	    })
	   	.catch(function (error)
	    {
	    	if(error.response)
	      {
					self.errors.title = error.response.errors;
	    	}
	   	});

	    myaxios.post('/api/v1/article/markdown',{
				'url':				document.getElementById("path").value,
				'csrf_name': 		document.getElementById("csrf_name").value,
				'csrf_value':		document.getElementById("csrf_value").value,
			})
	    .then(function (response) {
				self.markdown = response.data.data;
			
				/* activate math plugin */		
				if (typeof renderMathInElement === "function") { 
					self.$nextTick(function () {
						renderMathInElement(document.getElementById("blox"));
					});
				}

				/* check for youtube videos */
				if (typeof typemillUtilities !== "undefined") {
					setTimeout(function(){ 
						self.$nextTick(function () {
							typemillUtilities.start();
						});
					}, 200);
				}
	    })
	   	.catch(function (error)
	    {
	    	if(error.response)
	      {
					self.errors.title = error.response.errors;
	    	}
	   	});		
		},
		methods: {
			onStart: function()
			{

			},
			moveBlock: function(evt)
			{
				publishController.errors.message = false;

				var self = this;			

	    	myaxios.put('/api/v1/moveblock',{
					'url':			document.getElementById("path").value,
					'old_index': 	evt.oldIndex,
					'new_index':	evt.newIndex,
					'csrf_name': 	document.getElementById("csrf_name").value,
					'csrf_value':	document.getElementById("csrf_value").value,
				})
	      .then(function (response) {
				
					self.freeze = false;
				
					self.markdown = response.data.markdown;
					self.blockMarkdown = '';
					self.blockType = '';

					if(response.data.toc)
					{
						self.html.splice(response.data.toc.id, 1, response.data.toc);
					}
						
					publishController.publishDisabled = false;
					publishController.publishResult = "";

					/* update the navigation and mark navigation item as modified */
					navi.getNavi();

					/* update the math if plugin is there */
					self.checkMath(params.new_index+1);
	     	})
	     	.catch(function (error)
	     	{
	      	if(error)
	      	{
						publishController.publishDisabled = false;
	      	}
	        if(error.response)
	        {
						publishController.errors.message = error.response.data.errors.message;
	        }
	    	});
		},
		setData: function(event, blocktype, body)
		{
			if(this.unsafed){ return; }
			
			this.blockId = event.currentTarget.dataset.id;
			this.blockMarkdown = this.markdown[this.blockId];
			if(blocktype)
			{
				this.blockType = blocktype;
			}
			else if(this.blockId == 0)
			{ 
				this.blockType = "title-component"
			}
			else 
			{
				this.blockType = this.determineBlockType(this.blockMarkdown);
			}
		},
		clearData: function(event)
		{
			this.blockId = event.currentTarget.dataset.id;
			this.blockMarkdown = this.markdown[this.blockId];
		},
		hideModal: function()
		{
			this.addblock = false;
		},
		determineBlockType: function(block)
		{
			var result 		= false;
			var lines 		= block.split("\n");
			var firstChar 	= block[0];
			var secondChar 	= block[1];
			var thirdChar 	= block[2];

			for (var method in determiner) {
				result = determiner[method](block,lines,firstChar,secondChar,thirdChar);
				if(result !== false){ return result; }
			}
			return 'markdown-component';
		},
		checkMath(elementid)
		{
				/* make math plugin working */
				if (typeof renderMathInElement === "function")
				{
					self.$nextTick(function () {
						renderMathInElement(document.getElementById("blox-"+elementid));
					});
				}
				if (typeof MathJax !== 'undefined') {
					self.$nextTick(function () {
						MathJax.Hub.Queue(["Typeset",MathJax.Hub,"blox-"+elementid]);
					});
				}
		},
		initiateVideo()
		{
			/* check for youtube videos on first page load */
			if (typeof typemillUtilities !== "undefined")
			{
				this.$nextTick(function () {
					typemillUtilities.start();
				});
			}
		},
		checkVideo(elementid)
		{
			/* check for youtube videos for new blox */
			var element = document.getElementById("blox-"+elementid);

			if(element && typeof typemillUtilities !== "undefined")
			{
				imageElement = element.getElementsByClassName("youtube");

				if(imageElement[0])
				{
					typemillUtilities.addYoutubePlayButton(imageElement[0]);
				}
			}
		}
	}
});