class Type2 < Timestamp
  attr_accessor :is_passthrough, :as_of
	self.abstract_class = true	# Keep looking up the chain

  # Make it so every class that inherits from this one has the primary keys properly set
  # (act as if the child class has the line "self.primary_keys = ...")
  def self.inherited(child_class)
    super
    child_class.primary_key = :id
  end

  def versions
    self.class.all("1900-1-1").where(id: self.id).order(:dfrom)
  end

  def self.all(as_of = nil)
    x = super()
    as_of = as_of["as_of"] if as_of.is_a? Hash
    if as_of == nil
      x.where('"'+self.table_name+'".dto > NOW()')  # Current stuff
    else
      as_of = as_of.to_datetime if as_of.is_a? String
      if as_of.year == 1900
        x # Don't add any other conditions -- getting versions
      else
        x.where("? BETWEEN dfrom AND dto", [as_of])
      end
    end
  end

  # # This gets called the first time we exercise the class (such as CreditPack) in any way.
  # # After that it's never called again.
  # def self.has_many(name, scope = nil, options = {}, &extension)
  #   b4 = self.methods.dup
  #   puts "has many name: #{name.inspect}" # Name of what is being added, and other name/value stuff associated
  #   super
  #   # It built out 12 methods total, 3 before_add, 3 after_add, 3 before_remove, and 3 after_remove
  #   puts "new stuff: #{(self.methods - b4).inspect}"
  #   # So when does it add the actual credits / credit_ids / credits<<, etc?
  # end

#   # This is only for SELECTs apparently ... no UPDATE or INSERT
#   # Only one I saw called so far
#   def self.sanitize_sql incoming
#     x = super
#     if x.is_a? Arel::SelectManager
# #      pp x.ast.cores
#     else
#       pp x
#     end
#     x
#   end
# :sanitize, :sanitize_sql, :sanitize_conditions, :expand_hash_conditions_for_aggregates, :sanitize_sql_hash_for_conditions, :sanitize_sql_hash, :sanitize_sql_like, :sanitize_sql_array, :replace_bind_variable, :replace_named_bind_variables
# :replace_bind_variables, :sanitize_sql_for_assignment, sanitize_sql_hash_for_assignment, sanitize_sql_for_conditions

private

# This stuff is before it jumps into timestamp.rb
  def _update_record(attribute_names = self.attribute_names)
    if self.is_passthrough
      super(attribute_names)
    else
      # Cap the old one
      old = self.class.where(id: self.id, dfrom: self.dfrom).first
      old.is_passthrough = true
      current_times = ActiveRecord::Base.connection.execute("SELECT NOW() - INTERVAL '1 microsecond' AS old, NOW() AS new;").first
      # %%% Lame way to do this, but users tables with bcrypt are some hell
      if self.attribute_names.include?("password_digest")
        ActiveRecord::Base.connection.execute("UPDATE users SET dto = '"+current_times["old"]+"' WHERE dfrom= '"+self.dfrom.utc.strftime("%Y-%m-%d %H:%M:%S.%6N")+"' AND id= " + self.id.to_s)
      else
        old.update(dto: current_times["old"].to_datetime)
      end
      # Now INSERT the new version
      new_one = self.dup
      new_one.id = self.id
      self.dfrom = new_one.dfrom = current_times["new"].to_datetime
      new_one.save
    end
  end

  # Never actually destroy, just mark as done. Overrides active_record/persistence.rb
  def destroy_row
    if self.is_passthrough
      super
    else
      results = []
      relation_for_destroy.each do |x|
        if x.dfrom == self.dfrom
          @dto ||= ActiveRecord::Base.connection.execute("SELECT NOW() AS now;").first["now"]
          x.is_passthrough = true
          x.update(dto: @dto)
          self.dto = @dto
        end
      end
    end
  end

  # Wrapper to allow custom as_of times for .all, .find, .find_by
  # Can see msec with: Category.first.dfrom.strftime("%Y-%m-%d %H:%M:%S.%6N")
  class AsOf
    attr_accessor :as_of2, :klass
    def initialize(type, params)
      self.as_of2 = params["as_of"] if params["as_of"]
      # OK with this we will reflect on the original class and make a wrapper, adding methods as appropriate
      # Modifying all, find, find_by to give time-appropriate responses
      # but for now, let's just give back the original
      self.klass = type
    end
    def neighbors
    end
  end

end

# Update the update!
module ActiveRecord
  module Persistence
    # Updates the associated record with values matching those of the instance attributes.
    # Returns the number of affected rows.
    def _update_record(attribute_names = self.attribute_names)
      attributes_values = arel_attributes_with_values_for_update(attribute_names)
      if attributes_values.empty?
        0
      else
        if self.is_a? Type2
          self.class.unscoped._update_record attributes_values, [id, dfrom_was], id_was
        else
          self.class.unscoped._update_record attributes_values, id, id_was
        end
      end
    end
  end
  class Relation
    def _update_record(values, id, id_was) # :nodoc:
      substitutes, binds = substitute_values values

      scope = @klass.unscoped

      if @klass.finder_needs_type_condition?
        scope.unscope!(where: @klass.inheritance_column)
      end

      if id.is_a? Array
        relation = scope.where(@klass.primary_key => (id_was || id[0]))
        # id[1] is dfrom
        # Doesn't seem like we can easily pass in nil for dfrom :(
        relation = relation.where(dfrom: id[1]) if id[1] != nil
      else
        relation = scope.where(@klass.primary_key => (id_was || id))
      end
      bvs = binds + (relation.respond_to?(:bound_attributes) ? relation.bound_attributes : relation.bind_values)
      um = relation
        .arel
        .compile_update(substitutes, @klass.primary_key)

      @klass.connection.update(
        um,
        'SQL',
        bvs,
      )
    end
  end

end
