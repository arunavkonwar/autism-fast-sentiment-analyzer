class CreateRoles < ActiveRecord::Migration[5.0]
  def change
    create_table :roles do |t|
      t.string :domain
      t.string :name

      t.timestamps
    end
  end
end
