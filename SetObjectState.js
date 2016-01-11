/*global define */

define(["jquery", "qlik"], function($, qlik) {
	function createBtn(cmd, text) {
		//return '<button class="qirby-button" style="font-size:13px;" data-cmd="' + cmd + '">' + text + '</button>';
        return '<button style="font-size:13px;" data-cmd="' + cmd + '">' + text + '</button>';
	}
    //var html = '';
	return {
		initialProperties : {
			version : 1.0,
            listObjectsFromSheet : "thisSheet"
		},
		definition : {
			type : "items",
			component : "accordion",
			items : {
                settings : {
                    uses : "settings",
                    items : {
                        Listbox : {
                            type: "items",
							label: "Behaviour",     
                            items : {
								StyleOverride:{
									ref: "listObjectsFromSheet",
									expression:"optional",
									translation: "List Objects From",
									type: "string",
									defaultValue: "thisSheet",
									component: "dropdown",
									options: [ {
											value: "thisSheet",
											label: "This Sheet"
										}, {
											value: "allSheets",
											label: "All Sheets"
										}]
								}, 
                                setFootnote: {
                                    ref : "setFootnote",
							        type : "boolean",
							        label : "Set object footnote",
							        component : "switch",
                                    defaultValue : true,
                                    options : [{
                                        value : true,
                                        label : "Set footnote"
                                    }, {
                                        value : false,
                                        label : "Don't touch footnote"
                                    }]                                
                                }
                            }
                        }
                    }
                }
			}
		},
		snapshot: {
			canTakeSnapshot: false
		},        
		paint : function($element, layout) {
            
            //console.dir(layout);
			$element.css('overflow', 'auto');
            
		  	var self = this;
            var ownId = this.options.id;
			var html = '';
            var html2 = '';
            var app = qlik.currApp(this);
            var currSheet = qlik.navigation.getCurrentSheetId().sheetId;
            
            // get settings from accordeon menu
            var objFromAllSheets = layout.listObjectsFromSheet === 'allSheets';
            
            html += '<p><b>&nbsp;Object List</b></p>';
            html += '<div id="' + ownId + 'ObjListDiv">';
            //html += '<div class="qirby-buttongroup">';
            html += '<select id="' + ownId + 'ObjList">';
            //html += '<select class="qirby-select" id="cswObjList">';
            //html += '<option value="00fb1a8b-a3c2-4a74-84c6-fd261418540c">Current Selections</option>';
            
            
            // https://help.qlik.com/sense/2.1/en-US/developer/#../Subsystems/APIs/Content/MashupAPI/Methods/getAppObjectList-method.htm 
            
            //debugger;
            app.getAppObjectList( 'sheet', function(reply) 
            {
                //debugger;
                $.each(reply.qAppObjectList.qItems, function(outerKey, outerValue) {
                    
                    if (objFromAllSheets || outerValue.qInfo.qId === currSheet) {
                        // If outer loop returns the current sheet or all sheet objects are wanted ...
                        $.each(outerValue.qData.cells, function(innerKey,innerValue){
                            if (innerValue.name != ownId && innerValue.type != 'cswAltStateActions') { 
                                // only add object to list if it is not this own extension
                                html += '<option value="' + innerValue.name + '">';
                                html += innerValue.name + ' (' + innerValue.type;
                                if (objFromAllSheets) { html += ', sheet "' + outerValue.qData.title + '"'}
                                html += ')</option>';
                            }
                        });
                    }
                });
                
                //console.log("setting html in DOM");
                html += '</select></div>';
                html += '<p><b>&nbsp;State List</b></p>';
                html += '<div id="' + ownId + 'StatesListDiv">';
                html += '<select id="' + ownId + 'StatesList">';
                html += '<option value="$">Main State</option>';
                
                var getLayoutPromise = app.getAppLayout();
                
                getLayoutPromise.then (function(layout){			 
                    $.each(layout.qStateNames, function(key, value) {						
                      
                        var selectList = document.getElementById(ownId + "StatesList");
                        var option = document.createElement("option");
                        option.text = value;
                        option.value = value;
                        selectList.add(option);
                      
                    });
                });
                
                html += '</select>';
                
                
                //html += '<input class="qirby-input" type="text" id="altStateName" value="" name="altStateName"/>';            
                //html += '<input type="text" id="altStateName" value="" name="altStateName"/>';            
                html += createBtn("btnChgObject", "Set");
                html += '</div>';
                
		        $element.html(html);		
                
                $element.find('button').on('qv-activate', function() 
                {
				    switch($(this).data('cmd')) 
                    {					
					case 'btnChgObject':
						var objId = $element.find('#' + ownId + 'ObjList').val();
                        var stateName = $element.find('#' + ownId + 'StatesList').val();
                        var stateFootnote = '';
                        if (stateName != '$') {
                            stateFootnote = 'Alternate State: ' + stateName;
                        }
                         
// https://help.qlik.com/sense/2.1/en-US/developer/#../Subsystems/EngineAPI/Content/GenericObject/PropertyLevel/ListObjectDef.htm
                            
                        return app.getObject(objId).then(function(object) 
                        {
                            if (object.layout.qInfo.qType === 'filterpane') 
                            {
                                
                                if(layout.setFootnote) { 
                                    object.showTitles = true;
                                    object.layout.footnote = stateFootnote; 
                                }
                                console.log('Object ' + objId + ' is a filterpane. Looking for listboxes inside of it ...');
                                            
                                $.each(object.layout.qChildList.qItems, function(ArrayKey,ArrayVal){    
                                    objId = ArrayVal.qInfo.qId;
                                    
                                    return app.getObject(objId).then(function(childObject){
                                        console.log('Now patching object ' + objId 
                                            + ' which is of type "' + childObject.layout.qInfo.qType + '" to State "' + stateName + '"');
                                        //console.dir(childObject);

                                        var JSONpatch = JSON.parse(
                                        '{"qPath":"/qListObjectDef/qStateName", "qOp":"add", "qValue":"\\"' + stateName + '\\"" }'
                                        );
                                        
                                        return childObject.applyPatches([JSONpatch], false);                                    
                                    })
                                    
                                })
                                
                            } else if (object.layout.qInfo.qType === 'CurrentSelection') {
                                
                                // Patching the CurrentSelections is not possible maybe in later versions >2.2
                                
                                console.log('Cool! You try to patch the CurrentSelections!');
                                //console.dir(object);
                                
                                var JSONpatch = JSON.parse(
                                    '{"qPath":"/qSelectionObjectDef/qStateName", "qOp":"add", "qValue":"\\"' + stateName + '\\"" }'
                                );
                                
                                return object.applyPatches([JSONpatch], false);                                
                                
                            } else {
                                
                                console.log('Now patching object ' + objId 
                                    + ' which is of type "' + object.layout.qInfo.qType + '" to State "' + stateName + '"');
                                //console.dir(object);

                                var JSONpatch = JSON.parse(
                                '{"qPath":"/qHyperCubeDef/qStateName", "qOp":"add", "qValue":"\\"' + stateName + '\\"" }'
                                );
                                
                                if(layout.setFootnote) { 
                                    object.showTitles = true;
                                    object.layout.footnote = stateFootnote; 
                                }
                                return object.applyPatches([JSONpatch], false);
                            }
                        }); 
                            
                        app.doSave().then(function()
                        {
						  self.paint($element, layout);
						});	


				    }
			     });                
                
            });
			$element.html("Processing...");
		}
	};
});
