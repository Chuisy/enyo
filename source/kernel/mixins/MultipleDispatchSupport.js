//*@public
/**
	Allows a single object to dispatch its events to multiple registered
	listeners. Note that events generated by the object will be dispatched
	to all listeners, but events bubbled or dispatched to the object will
	only be propagated if the object has an _owner_. While the _owner_
	property may be set at any time, if a view initializes a new instance
	of the kind, its _owner_ will automatically be set.
*/
enyo.createMixin({

	// ...........................
	// PUBLIC PROPERTIES

	//*@public
	name: "enyo.MultipleDispatchSupport",

	// ...........................
	// PROTECTED PROPERTIES

	//*@protected
	_supports_multiple_dispatch: true,

	//*@protected
	_dispatch_targets: null,

	//*@protected
	/**
		A boolean flag used internally to communicate how to
		handle requests to bubble events
	*/
	_default_dispatch: false,

	//*@protected
	/**
		Controllers overload the event API and handle bubbling differently.
		All controllers support multiple dispatch and also bubbling to a single
		_owner_ under certain circumstances.
	*/
	_default_target: null,

	// ...........................
	// COMPUTED PROPERTIES

	//*@protected
	/**
		Overloads the bubble target.
	*/
	bubbleTarget: enyo.computed(function () {
		// if we have a valid dispatch target and default dispatching enabled,
		// we go head and return that object; otherwise, nothing, so it will
		// not propagate an event
		if (this._default_target && this._default_dispatch) {
			return this._default_target;
		}
	}, "_default_target", "_default_dispatch", {cached: true}),

	// ...........................
	// PUBLIC METHODS

	//*@public
	/**
		Sets as dispatch target an instance of _enyo.Component_ or a subkind
		that supports the event API.
	*/
	addDispatchTarget: function (target) {
		var $dist = this._dispatch_targets;
		// ensure that we have not already registered the target
		// and that it is not ourselves or our owner if we have one
		if (target && this !== target && !~$dist.indexOf(target)
			&& this.owner !== target) {
			// should be safe to add the listener
			$dist.push(target);
		}
	},

	//*@public
	/**
		Accepts an instance of a registered listener on this object as a
		parameter; if the passed-in listener is present the active dispatch
		targets, it is then removed.
	*/
	removeDispatchTarget: function (target) {
		var $dist = this._dispatch_targets;
		var idx = $dist.indexOf(target);
		if (-1 !== idx) {
			$dist.splice(idx, 1);
		}
	},

	// ...........................
	// PROTECTED METHODS

	//*@protected
	/**
		When the _owner_ changes, we have to check our state to make
		sure we are still appropriately set.
	*/
	ownerChanged: function () {
		// let the normal chain of owner changes occur
		this.inherited(arguments);
		// if we have an owner and it is a component we set our default
		// dispatch property to true to allow events to propagate to this
		// object
		if (this.owner && true === (this.owner instanceof enyo.Component)) {
			this.set("_default_target", this.owner);
		} else {
			// otherwise we either don't have an owner or they cannot
			// accept events so we remove our bubble target
			this.set("_default_target", null);
		}
	},

	//*@protected
	dispatchFrom: function (sender, event) {
		if (event.dispatchedByController) {
			if (event.dispatchController === this) {
				return true;
			}
		} else if (sender === this) {
			event.dispatchedByController = true;
			event.dispatchController = this;
		}
		return false;
	},

	//*@protected
	bubbleUp: function (name, event, sender) {
		var targets;

		// TODO: for now, this is solving a problem that is not obvious
		// whether or not this change will make a difference for
		// solely owned controllers this can potentially cause top
		// level application-instances to receive the same bubbled event
		// twice if it is not explicitly handled and has a truthy value
		// returned somewhere to stop propagation

		if (this._default_dispatch) {
			this.inherited(arguments);
		}

		targets = this._dispatch_targets;
		enyo.forEach(enyo.clone(targets), function (target) {
			if (target) {
				if (target.destroyed) {
					this.removeDispatchTarget(target);
				} else {
					target.dispatchBubble(name, event, sender);
				}
			}
		}, this);
	},

	//*@protected
	dispatchEvent: function (name, event, sender) {
		if (this.dispatchFrom(sender, event)) {
			return false;
		}
		return this.inherited(arguments);
	},

	//*@protected
	bubbleDelegation: function (delegate, prop, name, event, sender) {
		if (this._default_dispatch) {
			this.inherited(arguments);
		}
		var targets = this.get("_dispatch_targets");
		enyo.forEach(enyo.clone(targets), function (target) {
			if (target) {
				if (target.destroyed) {
					this.removeDispatchTarget(target);
				} else {
					target.delegateEvent(delegate, prop, name, event, sender);
				}
			}
		});
	},

	//*@protected
	create: function () {
		this._dispatch_targets = [];
	}

	// ...........................
	// OBSERVERS

});
