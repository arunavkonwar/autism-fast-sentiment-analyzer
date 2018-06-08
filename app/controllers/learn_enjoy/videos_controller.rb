class LearnEnjoy::VideosController < ApplicationController
  def index
    unless current_user && current_user.roles.map(&:domain).include?("learn_enjoy")
      # Go grab pick_user instance variables
      @is_login = true
      self.pick_users
      render :pick_users
    else
      if Video.count == 0
        marcia = User.find_by(name: "Marcia")
        marcia.videos << Video.create(owner: marcia, name: "Alex playing with Jacob", file: "test3.mp4")
        marcia.videos << Video.create(owner: marcia, name: "Alex goofing around at the house", file: "test.mp4")
      end
      @videos = Video.find_by_sql("SELECT v.id, v.name,
          COUNT(DISTINCT uv.id) AS num_assoc,
          COUNT(DISTINCT uvc.id) AS num_comments,
          u.id AS owner_id, u.name AS owner
        FROM videos AS v
          INNER JOIN users AS u ON v.owner_id = u.id
            AND u.dto > NOW()
          LEFT OUTER JOIN user_videos AS uv ON v.id = uv.video_id
            AND uv.user_id != #{current_user.id}
          LEFT OUTER JOIN user_video_comments AS uvc ON uv.id = uvc.user_video_id
        GROUP BY v.id, v.name, u.id, u.name
        ORDER BY v.name")
    end
  end

  def login
    # %%% Yes i know this is extreme technical debt!
    session[:user_id] = params[:user_id].to_i
    render json:{success: true}
  end

  def show
    @video = Video.find(params[:id])
  end

  def pick_users
    roles = Role.where(domain: "learn_enjoy").to_a
    if roles.empty? || UserRole.count == 0
      # Our silly little seeding routine for the demo
      roles << (parent = Role.find_or_create_by(name: "Parent", domain: "learn_enjoy"))
      parent.users << User.find_or_create_by(name: "Marcia", avatar: "pineapple.png")
      parent.users << User.find_or_create_by(name: "Fred", avatar: "zebra.png")
      parent.users << User.find_or_create_by(name: "Caren", avatar: "cat.png")

      roles << (teacher = Role.find_or_create_by(name: "Teacher", domain: "learn_enjoy"))
      teacher.users << User.find_or_create_by(name: "Mrs. Wilson", avatar: "orange.png")
      teacher.users << User.find_or_create_by(name: "Mr. Gerard", avatar: "crab.png")

      roles << (psychiatrist = Role.find_or_create_by(name: "Psychiatrist", domain: "learn_enjoy"))
      psychiatrist.users << User.find_or_create_by(name: "Dr. Appleby", avatar: "goldfish.png")
      psychiatrist.users << User.find_or_create_by(name: "Dr. Cartwright", avatar: ".png")

      roles << (speech_therapist = Role.find_or_create_by(name: "Speech Therapist", domain: "learn_enjoy"))
      speech_therapist.users << User.find_or_create_by(name: "Ms. Stone", avatar: ".png")
    end
    roles.each do |role|
      var_name = "@#{role.name.gsub(" ","").underscore}s".to_sym
      instance_variable_set(var_name, role.users || [])
    end
    unless @is_login
      @video = Video.find_by(id: params[:id])
      @selected_users = @video.user_ids
    end
  end

  def associate_users
    video = Video.find_by(id: params[:id])
    existing_users = video.user_ids
    desired_users = []
    params.keys.each do |key|
      if key.start_with?("usr")
        desired_users << key[3..-1].to_i
      end
    end
    (desired_users - existing_users).each do |user_id|
      video.user_videos.create(user_id: user_id)
    end
    video.user_videos.where(user_id: (existing_users - desired_users)).destroy_all
    self.index
    render :index
  end
end
