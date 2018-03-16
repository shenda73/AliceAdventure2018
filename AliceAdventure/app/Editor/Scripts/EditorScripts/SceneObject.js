'use strict';

const PIXI = require('../../../Resources/pixi');
const FS = require('fs-extra');
const ID = require('./ID');
const Debug = require('./Debug');
const GameProperties = require('./GameProperties');
const Event = require('./Event');

// class
var SceneObject;

// variables
SceneObject = function(_id = null, _name = "untitled", _src = "", _bindScene = null){
	if (_id == null) _id = ID.newID; // NEVER MODIFY THIS
	this.id = _id;
	this.name = _name;
	this.bindScene = _bindScene;

	this.selectAllowed = true;
	this.selected = false;
	this.dragAllowed = true;
	this.drag = { on: false, eventData: {} };

	this.properties = [];
	this.src = _src;
	this.sprite = null;
	this.interactive = true;

	GameProperties.AddObject(this);
};

// static properties
SceneObject.AddObject = function(_objInfo, _bindScene, _x, _y){
	// test TODO: should read from objIndex // currently _objIndex is the file name
	let _path = _objInfo.src;
	let _obj = new SceneObject(null, _objInfo.name, _path, _bindScene);
	_obj.InitSprite('../../' + _path, {x: _x, y: _y});

	return _obj;
};

SceneObject.LoadObject = function(_data){ // I AM HERE
	let _o = new SceneObject(_data.id, _data.name, _data.src, GameProperties.GetSceneById(_data.bindScene));
	_o.interactive = _data.interactive;
	_o.properties = _data.properties;
	_o.InitSprite('../../' + _data.src, _data.pos, _data.scale, _data.anchor, _data.active);
}

SceneObject.Selection = { 
	objects: [], // Reference
	set: function(_obj){
		this.objects = [_obj];
		Event.Broadcast("update-selected-object");
	}, 
	add: function(_obj){
		this.objects.push(_obj);
		Event.Broadcast("update-selected-object");
	},
	remove: function(_obj){
		var i = this.objects.indexOf(_obj);
		if (i >= 0) {
			this.objects.splice(i, 1);
			Event.Broadcast("update-selected-object");
		} else {
			Debug.LogWarning("Trying to remove missing selection object: " + _obj.name);
		}
	},
	clear: function(){
		this.objects = [];
		Event.Broadcast("update-selected-object");
	},
	contain: function(_obj){
		return (this.objects.indexOf(_obj) >= 0);
	}
};

// functions
SceneObject.prototype.InitSprite = function(_url, _pos = {x: 0, y: 0}, _scale = {x: 1, y: 1}, _anchor = {x: 0.5, y: 0.5}, _active = true){
	if (!(this instanceof SceneObject)) return;
	this.sprite = PIXI.Sprite.fromImage(_url);
	this.sprite.x = isNumberOr(_pos.x, 0);
	this.sprite.y = isNumberOr(_pos.y, 0);
	this.sprite.scale.set(isNumberOr(_scale.x, 1), isNumberOr(_scale.y, 1));
	this.sprite.anchor.set(isNumberOr(_anchor.x, 0.5), isNumberOr(_anchor.y, 0.5));
	this.sprite.visible = _active;
	this.sprite.interactive = true;
	this.sprite
		.on("pointerdown", (e)=>{this.OnPointerDown(e);})
		.on("pointermove", (e)=>{this.OnPointerMove(e);})
		.on("pointerup", (e)=>{this.OnPointerUp(e);});
};

SceneObject.prototype.DeleteThis = function(){
	GameProperties.DeleteObject(this);
};

SceneObject.prototype.AddUserProperty = function(_key, _type, _value){
	this.properties.push({
		key: _key,
		type: _type, 
		value: _value
	});
};

SceneObject.prototype.GetUserProperty = function(_name){
	for (var i in this.properties){
		if (this.properties[i].name == _name){
			return this.properties[i].value;
		}
	}
	return undefined;
};

SceneObject.prototype.EditDefinedProperty = function(_name, _value){
	switch (_name){
	case 'name': 
		this[_name] = _value;
		break;
	case 'x':
	case 'y':
	case 'active':
		// TODO: set sprite attribute
		break;
	default:
		Debug.LogError("Invalid property name: " + _name + "for object " + this.name);
		return;
	}
};

SceneObject.prototype.EditUserProperty = function(_name, _value){
	if (this.properties[_name] == undefined) {
		Debug.LogError("Invalid property name: " + _name + "for object " + this.name);
		return;
	}
	if (this.properties[_name].type != typeof _value) {
		Debug.LogError("Invalid type of value: " + _value + "for object " + this.name);
		return;
	}

	this.properties[_name].value = _value;
};

SceneObject.prototype.SelectOff = function(){
	this.sprite.alpha = 1;
	SceneObject.Selection.clear();
};

SceneObject.prototype.SelectOn = function(_add = false){
	if (_add){
		SceneObject.Selection.add(this);
		this.sprite.alpha = 0.7;
	} else{
		if (SceneObject.Selection.objects[0] != null){
			SceneObject.Selection.objects[0].SelectOff();
		}
		SceneObject.Selection.set(this);
		this.sprite.alpha = 0.7;
	}
};

SceneObject.prototype.IsSelected = function(){
	return SceneObject.Selection.contain(this);
};

SceneObject.prototype.OnPointerDown = function(_event){
	if (!(this instanceof SceneObject)) return;

	// Select this object
	if (this.selectAllowed){
		this.SelectOn();
	}

	// Start dragging
	if (this.dragAllowed){
		this.drag.on = true;
		this.drag.eventData = _event.data;
	}
};

SceneObject.prototype.OnPointerMove = function(_event){
	if (!(this instanceof SceneObject)) return;

	// While dragging
	if (this.dragAllowed && this.drag.on){
		var newPosition = this.drag.eventData.getLocalPosition(this.sprite.parent);
		this.sprite.x = Math.floor(newPosition.x);
		this.sprite.y = Math.floor(newPosition.y);
	}
};

SceneObject.prototype.OnPointerUp = function(_event){
	if (!(this instanceof SceneObject)) return;

	// Start dragging
	if (this.dragAllowed){
		this.drag.on = false;
	}
};

Event.AddListener("reload-project", ()=>{SceneObject.Selection.clear();})

module.exports = SceneObject;